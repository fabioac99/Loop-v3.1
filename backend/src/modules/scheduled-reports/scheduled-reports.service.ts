import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class ScheduledReportsService {
  private readonly logger = new Logger(ScheduledReportsService.name);

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) { }

  // ==================== CONFIG MANAGEMENT ====================

  async getConfigs() {
    return this.prisma.reportConfig.findMany({ orderBy: { name: 'asc' } });
  }

  async updateConfig(id: string, data: any) {
    return this.prisma.reportConfig.update({
      where: { id },
      data: {
        isEnabled: data.isEnabled ?? undefined,
        deliveryEmail: data.deliveryEmail ?? undefined,
        deliveryApp: data.deliveryApp ?? undefined,
        recipients: data.recipients ?? undefined,
      },
    });
  }

  // ==================== SNAPSHOTS ====================

  async getSnapshots(user: any, reportType?: string, limit = 30) {
    return this.prisma.reportSnapshot.findMany({
      where: {
        ...(reportType ? { reportType } : {}),
        OR: [
          { generatedFor: user.id },
          { generatedFor: 'all' },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, reportType: true, title: true, createdAt: true, data: true },
    });
  }

  async getSnapshotFull(id: string) {
    const s = await this.prisma.reportSnapshot.findUnique({ where: { id } });
    if (!s) throw new NotFoundException();
    return s;
  }

  // ==================== CRON JOBS ====================

  @Cron('0 8 * * 1-5', { name: 'daily-report' })
  async cronDaily() { await this.runReport('daily_summary'); }

  @Cron('0 8 * * 1', { name: 'weekly-report' })
  async cronWeekly() { await this.runReport('weekly_summary'); }

  @Cron('0 9 * * 1-5', { name: 'overdue-alert' })
  async cronOverdue() { await this.runReport('overdue_alert'); }

  @Cron('0 9 * * 1', { name: 'agent-performance' })
  async cronAgent() { await this.runReport('agent_performance'); }

  // ==================== CORE RUNNER ====================

  async runReport(reportType: string) {
    const config = await this.prisma.reportConfig.findUnique({ where: { reportType } });
    if (!config || !config.isEnabled) {
      this.logger.log(`⏭️ Report "${reportType}" disabled, skipping.`);
      return { skipped: true };
    }

    this.logger.log(`⏰ Running report: ${config.name}`);
    const recipients = await this.getReportRecipients(config.recipients);
    let saved = 0, sent = 0;

    for (const user of recipients) {
      try {
        const report = await this.buildReport(reportType, user);

        if (config.deliveryApp) {
          await this.prisma.reportSnapshot.create({
            data: { reportType, title: report.subject, htmlContent: report.html, data: report.data || {}, generatedFor: user.id },
          });
          saved++;
        }

        if (config.deliveryEmail && this.mail.isConfigured()) {
          await this.mail.sendMail(user.email, report.subject, report.html);
          sent++;
        }
      } catch (err: any) {
        this.logger.error(`Failed ${reportType} for ${user.email}: ${err.message}`);
      }
    }

    await this.prisma.reportConfig.update({ where: { reportType }, data: { lastRunAt: new Date() } });
    this.logger.log(`✅ "${config.name}": ${saved} saved, ${sent} emailed`);
    return { saved, sent };
  }

  async sendReportNow(userId: string, reportType: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { department: true } });
    if (!user) return { sent: false, error: 'User not found' };

    const config = await this.prisma.reportConfig.findUnique({ where: { reportType } });
    if (!config) return { sent: false, error: 'Report type not found' };
    if (!config.isEnabled) return { sent: false, error: 'Report is disabled' };

    const report = await this.buildReport(reportType, user);

    // Always save snapshot on manual trigger
    await this.prisma.reportSnapshot.create({
      data: { reportType, title: report.subject, htmlContent: report.html, data: report.data || {}, generatedFor: userId },
    });

    let emailed = false;
    if (config.deliveryEmail && this.mail.isConfigured()) {
      emailed = await this.mail.sendMail(user.email, report.subject, report.html);
    }

    return { sent: true, emailed, savedToApp: true, subject: report.subject };
  }

  // ==================== REPORT BUILDERS ====================

  private async buildReport(type: string, user: any): Promise<{ subject: string; html: string; data?: any }> {
    switch (type) {
      case 'daily_summary': return this.buildDailySummary(user);
      case 'weekly_summary': return this.buildWeeklySummary(user);
      case 'overdue_alert': return this.buildOverdueAlert(user);
      case 'agent_performance': return this.buildAgentPerformance(user);
      case 'sla_breach': return this.buildOverdueAlert(user);
      default: throw new Error(`Unknown report type: ${type}`);
    }
  }

  private async buildDailySummary(user: any) {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const isAdmin = user.globalRole === 'GLOBAL_ADMIN';
    const deptId = user.departmentId;
    const now = new Date();
    const yesterday = new Date(now.getTime() - 86400000);
    const df: any = isAdmin ? {} : { OR: [{ toDepartmentId: deptId }, { fromDepartmentId: deptId }] };
    const of = { status: { notIn: ['CLOSED', 'REJECTED', 'DRAFT'] as any } };

    const [totalOpen, created24h, closed24h, overdue, unassigned, byStatus] = await Promise.all([
      this.prisma.ticket.count({ where: { ...df, ...of } }),
      this.prisma.ticket.count({ where: { ...df, createdAt: { gte: yesterday } } }),
      this.prisma.ticket.count({ where: { ...df, closedAt: { gte: yesterday }, status: { in: ['CLOSED'] as any } } }),
      this.prisma.ticket.count({ where: { ...df, ...of, slaResolutionDeadline: { lt: now } } }),
      this.prisma.ticket.count({ where: { ...df, ...of, assignedToId: null } }),
      this.prisma.ticket.groupBy({ by: ['status'], _count: true, where: { ...df, ...of } }),
    ]);

    const urgent = await this.prisma.ticket.findMany({
      where: { ...df, ...of, priority: { in: ['URGENT', 'HIGH'] as any } },
      select: { ticketNumber: true, title: true, priority: true, assignedTo: { select: { firstName: true, lastName: true } } },
      take: 10, orderBy: { createdAt: 'desc' },
    });

    const deptName = isAdmin ? 'All Departments' : (user.department?.name || 'Your Dept');
    const subject = `Daily Summary — ${deptName} — ${now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`;
    const data = { totalOpen, created24h, closed24h, overdue, unassigned, byStatus: byStatus.map(s => ({ status: s.status, count: (s as any)._count })), urgentTickets: urgent, deptName, date: now.toISOString() };

    const statusRows = byStatus.map((s: any) => `<tr><td style="padding:6px 12px;font-size:13px;">${s.status.replace('_', ' ')}</td><td style="padding:6px 12px;font-size:13px;font-weight:600;text-align:right;">${s._count}</td></tr>`).join('');
    const urgentRows = urgent.map(t => `<tr><td style="padding:6px 12px;font-size:12px;font-family:monospace;">${t.ticketNumber}</td><td style="padding:6px 12px;font-size:12px;">${t.title.slice(0, 50)}</td><td style="padding:6px 12px;font-size:12px;color:${t.priority === 'URGENT' ? '#ef4444' : '#f59e0b'};font-weight:600;">${t.priority}</td><td style="padding:6px 12px;font-size:12px;">${t.assignedTo ? `${t.assignedTo.firstName} ${t.assignedTo.lastName}` : '<em style="color:#a1a1aa;">Unassigned</em>'}</td></tr>`).join('');

    const body = `<p>Good morning, <strong>${user.firstName}</strong>! Daily summary for <strong>${deptName}</strong>.</p>
      ${this.kpiCards([
      { label: 'Open', value: totalOpen, color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd' },
      { label: 'Closed (24h)', value: closed24h, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
      { label: 'Overdue', value: overdue, color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
      { label: 'Unassigned', value: unassigned, color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
    ])}
      <p style="font-size:13px;color:#64748b;">📩 <strong>${created24h}</strong> new ticket(s) in the last 24h.</p>
      ${statusRows ? `<h3 style="font-size:14px;margin:24px 0 8px;">Open by Status</h3><table style="width:100%;border-collapse:collapse;border:1px solid #e4e4e7;border-radius:8px;"><thead><tr style="background:#f4f4f5;"><th style="padding:8px 12px;text-align:left;font-size:12px;color:#71717a;">Status</th><th style="padding:8px 12px;text-align:right;font-size:12px;color:#71717a;">Count</th></tr></thead><tbody>${statusRows}</tbody></table>` : ''}
      ${urgentRows ? `<h3 style="font-size:14px;margin:24px 0 8px;color:#ef4444;">⚠️ Urgent / High Priority</h3><table style="width:100%;border-collapse:collapse;border:1px solid #e4e4e7;border-radius:8px;"><thead><tr style="background:#fef2f2;"><th style="padding:8px 12px;text-align:left;font-size:11px;">#</th><th style="padding:8px 12px;text-align:left;font-size:11px;">Title</th><th style="padding:8px 12px;text-align:left;font-size:11px;">Priority</th><th style="padding:8px 12px;text-align:left;font-size:11px;">Assigned</th></tr></thead><tbody>${urgentRows}</tbody></table>` : ''}`;

    return { subject, html: this.reportTemplate(subject, body, `${appUrl}/dashboard`), data };
  }

  private async buildWeeklySummary(user: any) {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const isAdmin = user.globalRole === 'GLOBAL_ADMIN';
    const deptId = user.departmentId;
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const df: any = isAdmin ? {} : { OR: [{ toDepartmentId: deptId }, { fromDepartmentId: deptId }] };
    const of = { status: { notIn: ['CLOSED', 'REJECTED', 'DRAFT'] as any } };

    const [totalOpen, created, closed, overdue, closedTickets, topAgents] = await Promise.all([
      this.prisma.ticket.count({ where: { ...df, ...of } }),
      this.prisma.ticket.count({ where: { ...df, createdAt: { gte: weekAgo } } }),
      this.prisma.ticket.count({ where: { ...df, closedAt: { gte: weekAgo }, status: { in: ['CLOSED'] as any } } }),
      this.prisma.ticket.count({ where: { ...df, ...of, slaResolutionDeadline: { lt: now } } }),
      this.prisma.ticket.findMany({ where: { ...df, closedAt: { gte: weekAgo, not: null } }, select: { createdAt: true, closedAt: true, slaResolutionDeadline: true } }),
      this.prisma.ticket.groupBy({ by: ['assignedToId'], _count: true, where: { ...df, closedAt: { gte: weekAgo }, assignedToId: { not: null } }, orderBy: { _count: { assignedToId: 'desc' } }, take: 5 }),
    ]);

    const avgHours = closedTickets.length > 0 ? Math.round(closedTickets.reduce((s, t) => s + ((t.closedAt!.getTime() - t.createdAt.getTime()) / 3600000), 0) / closedTickets.length * 10) / 10 : 0;
    let slaMet = 0, slaB = 0;
    for (const t of closedTickets) { if (t.slaResolutionDeadline && t.closedAt) { t.closedAt <= t.slaResolutionDeadline ? slaMet++ : slaB++; } }
    const slaRate = (slaMet + slaB) > 0 ? Math.round((slaMet / (slaMet + slaB)) * 100) : 100;

    const agentIds = topAgents.filter((a: any) => a.assignedToId).map((a: any) => a.assignedToId);
    const agents = agentIds.length > 0 ? await this.prisma.user.findMany({ where: { id: { in: agentIds } }, select: { id: true, firstName: true, lastName: true } }) : [];
    const am = Object.fromEntries(agents.map(a => [a.id, a]));
    const agentRows = topAgents.filter((a: any) => am[a.assignedToId]).map((a: any, i: number) => `<tr><td style="padding:6px 12px;font-size:13px;">${i + 1}. ${am[a.assignedToId].firstName} ${am[a.assignedToId].lastName}</td><td style="padding:6px 12px;font-size:13px;font-weight:600;text-align:right;">${a._count} closed</td></tr>`).join('');

    const deptName = isAdmin ? 'All Departments' : (user.department?.name || 'Your Dept');
    const subject = `Weekly Report — ${deptName} — ${weekAgo.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} to ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    const data = { totalOpen, created, closed, overdue, avgHours, slaRate, slaMet, slaBreached: slaB, deptName, topAgents: topAgents.map((a: any) => ({ id: a.assignedToId, name: am[a.assignedToId] ? `${am[a.assignedToId].firstName} ${am[a.assignedToId].lastName}` : 'Unknown', closed: a._count })) };

    const body = `<p>Weekly summary for <strong>${deptName}</strong>.</p>
      ${this.kpiCards([
      { label: 'Open Now', value: totalOpen, color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd' },
      { label: 'Created', value: created, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
      { label: 'Closed', value: closed, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
      { label: 'Overdue', value: overdue, color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
    ])}
      <h3 style="font-size:14px;margin:24px 0 8px;">📊 Key Metrics</h3>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e4e4e7;border-radius:8px;">
        <tbody>
          <tr style="background:#f4f4f5;"><td style="padding:8px 12px;font-size:13px;">Avg Resolution</td><td style="padding:8px 12px;font-weight:600;text-align:right;">${avgHours}h</td></tr>
          <tr><td style="padding:8px 12px;font-size:13px;">SLA Compliance</td><td style="padding:8px 12px;font-weight:600;text-align:right;color:${slaRate >= 90 ? '#16a34a' : slaRate >= 70 ? '#d97706' : '#dc2626'};">${slaRate}%</td></tr>
          <tr style="background:#f4f4f5;"><td style="padding:8px 12px;font-size:13px;">Resolution Rate</td><td style="padding:8px 12px;font-weight:600;text-align:right;">${created > 0 ? Math.round((closed / created) * 100) : 0}%</td></tr>
        </tbody>
      </table>
      ${agentRows ? `<h3 style="font-size:14px;margin:24px 0 8px;">🏆 Top Performers</h3><table style="width:100%;border-collapse:collapse;border:1px solid #e4e4e7;border-radius:8px;"><tbody>${agentRows}</tbody></table>` : ''}`;

    return { subject, html: this.reportTemplate(subject, body, `${appUrl}/dashboard`), data };
  }

  private async buildOverdueAlert(user: any) {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const isAdmin = user.globalRole === 'GLOBAL_ADMIN';
    const deptId = user.departmentId;
    const df: any = isAdmin ? {} : { OR: [{ toDepartmentId: deptId }, { fromDepartmentId: deptId }] };
    const now = new Date();

    const tickets = await this.prisma.ticket.findMany({
      where: { ...df, status: { notIn: ['CLOSED', 'REJECTED', 'DRAFT'] as any }, slaResolutionDeadline: { lt: now } },
      select: { ticketNumber: true, title: true, priority: true, slaResolutionDeadline: true, assignedTo: { select: { firstName: true, lastName: true } } },
      orderBy: { slaResolutionDeadline: 'asc' }, take: 20,
    });

    const deptName = isAdmin ? 'All Departments' : (user.department?.name || 'Your Dept');
    const subject = `⚠️ ${tickets.length} Overdue Ticket(s) — ${deptName}`;
    const data = { count: tickets.length, tickets: tickets.map(t => ({ ...t, hoursOverdue: Math.round((now.getTime() - new Date(t.slaResolutionDeadline!).getTime()) / 3600000) })), deptName };

    const rows = tickets.map(t => {
      const h = Math.round((now.getTime() - new Date(t.slaResolutionDeadline!).getTime()) / 3600000);
      return `<tr><td style="padding:6px 12px;font-size:12px;font-family:monospace;">${t.ticketNumber}</td><td style="padding:6px 12px;font-size:12px;">${t.title.slice(0, 45)}</td><td style="padding:6px 12px;font-size:12px;color:#dc2626;font-weight:600;">${h}h late</td><td style="padding:6px 12px;font-size:12px;">${t.assignedTo ? `${t.assignedTo.firstName} ${t.assignedTo.lastName}` : '<em style="color:#a1a1aa;">Unassigned</em>'}</td></tr>`;
    }).join('');

    const body = `<p>⚠️ <strong>${tickets.length}</strong> overdue ticket(s) in <strong>${deptName}</strong>.</p>
      ${rows ? `<table style="width:100%;border-collapse:collapse;border:1px solid #fecaca;border-radius:8px;"><thead><tr style="background:#fef2f2;"><th style="padding:8px 12px;text-align:left;font-size:11px;">#</th><th style="padding:8px 12px;text-align:left;font-size:11px;">Title</th><th style="padding:8px 12px;text-align:left;font-size:11px;">Overdue</th><th style="padding:8px 12px;text-align:left;font-size:11px;">Assigned</th></tr></thead><tbody>${rows}</tbody></table>` : '<p style="color:#16a34a;">✅ No overdue tickets!</p>'}`;

    return { subject, html: this.reportTemplate(subject, body, `${appUrl}/dashboard/tickets`), data };
  }

  private async buildAgentPerformance(user: any) {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const isAdmin = user.globalRole === 'GLOBAL_ADMIN';
    const deptId = user.departmentId;
    const df: any = isAdmin ? {} : { OR: [{ toDepartmentId: deptId }, { fromDepartmentId: deptId }] };
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    const of = { status: { notIn: ['CLOSED', 'REJECTED', 'DRAFT'] as any } };

    const aw: any = { isActive: true };
    if (!isAdmin) aw.departmentId = deptId;
    const agents = await this.prisma.user.findMany({ where: aw, select: { id: true, firstName: true, lastName: true } });

    const stats = await Promise.all(agents.map(async a => {
      const [open, closedWeek, total] = await Promise.all([
        this.prisma.ticket.count({ where: { assignedToId: a.id, ...df, ...of } }),
        this.prisma.ticket.count({ where: { assignedToId: a.id, ...df, closedAt: { gte: weekAgo } } }),
        this.prisma.ticket.count({ where: { assignedToId: a.id, ...df } }),
      ]);
      return { name: `${a.firstName} ${a.lastName}`, open, closedWeek, total };
    }));

    const active = stats.filter(a => a.total > 0).sort((a, b) => b.closedWeek - a.closedWeek);
    const deptName = isAdmin ? 'All Departments' : (user.department?.name || 'Your Dept');
    const subject = `Agent Performance — ${deptName}`;
    const data = { agents: active, deptName };

    const rows = active.map(a => `<tr><td style="padding:8px 12px;font-size:13px;">${a.name}</td><td style="padding:8px 12px;text-align:center;">${a.open}</td><td style="padding:8px 12px;text-align:center;font-weight:600;color:#16a34a;">${a.closedWeek}</td><td style="padding:8px 12px;text-align:center;">${a.total}</td></tr>`).join('');

    const body = `<p>Agent performance for <strong>${deptName}</strong> (last 7 days).</p>
      ${rows ? `<table style="width:100%;border-collapse:collapse;border:1px solid #e4e4e7;border-radius:8px;"><thead><tr style="background:#f4f4f5;"><th style="padding:8px 12px;text-align:left;font-size:12px;">Agent</th><th style="padding:8px 12px;text-align:center;font-size:12px;">Open</th><th style="padding:8px 12px;text-align:center;font-size:12px;">Closed (7d)</th><th style="padding:8px 12px;text-align:center;font-size:12px;">Total</th></tr></thead><tbody>${rows}</tbody></table>` : '<p>No data.</p>'}`;

    return { subject, html: this.reportTemplate(subject, body, `${appUrl}/dashboard/team-performance`), data };
  }

  // ==================== HELPERS ====================

  private async getReportRecipients(rules: string[]) {
    const or: any[] = [];
    for (const r of rules) {
      if (r === 'dept_heads') or.push({ departmentRole: 'DEPARTMENT_HEAD' });
      else if (r === 'admins') or.push({ globalRole: 'GLOBAL_ADMIN' });
      else or.push({ id: r });
    }
    if (or.length === 0) return [];
    return this.prisma.user.findMany({ where: { isActive: true, OR: or }, include: { department: true } });
  }

  private kpiCards(items: { label: string; value: number; color: string; bg: string; border: string }[]) {
    return `<div style="display:flex;gap:12px;margin:20px 0;">${items.map(i =>
      `<div style="flex:1;background:${i.bg};border:1px solid ${i.border};border-radius:8px;padding:16px;text-align:center;"><div style="font-size:28px;font-weight:700;color:${i.color};">${i.value}</div><div style="font-size:11px;color:#64748b;margin-top:4px;">${i.label}</div></div>`
    ).join('')}</div>`;
  }

  private reportTemplate(title: string, body: string, actionUrl: string): string {
    const appName = process.env.APP_NAME || 'LOOP';
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:620px;margin:0 auto;padding:24px;">
  <div style="background:#18181b;border-radius:12px 12px 0 0;padding:20px 24px;"><span style="color:#fff;font-size:18px;font-weight:700;">${appName}</span><span style="color:#a1a1aa;font-size:11px;float:right;margin-top:4px;">Automated Report</span></div>
  <div style="background:#fff;padding:28px 24px;border-left:1px solid #e4e4e7;border-right:1px solid #e4e4e7;"><div style="font-size:14px;line-height:1.6;color:#3f3f46;">${body}</div>
    <div style="margin:28px 0 8px;"><a href="${actionUrl}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:600;">Open Dashboard</a></div></div>
  <div style="background:#fafafa;border-radius:0 0 12px 12px;padding:16px 24px;border:1px solid #e4e4e7;border-top:0;"><p style="margin:0;font-size:11px;color:#a1a1aa;">Automated report from <a href="${appUrl}" style="color:#6366f1;">${appName}</a>.</p></div>
</div></body></html>`;
  }
}