import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) { }

  async getOverview(user: any, params: { departmentId?: string; dateFrom?: string; dateTo?: string }) {
    const where: any = {};
    if (params.departmentId) where.toDepartmentId = params.departmentId;
    if (user.globalRole !== 'GLOBAL_ADMIN' && user.departmentRole === 'DEPARTMENT_HEAD') {
      where.OR = [{ toDepartmentId: user.departmentId }, { fromDepartmentId: user.departmentId }];
    }
    if (params.dateFrom) where.createdAt = { ...where.createdAt, gte: new Date(params.dateFrom) };
    if (params.dateTo) where.createdAt = { ...where.createdAt, lte: new Date(params.dateTo) };

    const [total, byStatus, byPriority, byDepartment, overdue, avgResolution] = await Promise.all([
      this.prisma.ticket.count({ where }),
      this.prisma.ticket.groupBy({ by: ['status'], _count: true, where }),
      this.prisma.ticket.groupBy({ by: ['priority'], _count: true, where }),
      this.prisma.ticket.groupBy({ by: ['toDepartmentId'], _count: true, where }),
      this.prisma.ticket.count({ where: { ...where, slaResolutionDeadline: { lt: new Date() }, status: { notIn: ['CLOSED', 'REJECTED'] } } }),
      this.prisma.ticket.aggregate({
        where: { ...where, closedAt: { not: null } },
        _avg: { slaPausedDuration: true },
      }),
    ]);

    // Get department names
    const depts = await this.prisma.department.findMany({ select: { id: true, name: true, color: true } });
    const deptMap = Object.fromEntries(depts.map(d => [d.id, d]));

    const ticketsPerDept = byDepartment.map((d: any) => ({
      departmentId: d.toDepartmentId,
      department: deptMap[d.toDepartmentId],
      count: d._count,
    }));

    // Monthly tickets (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const monthlyRaw = await this.prisma.$queryRaw`
      SELECT date_trunc('month', created_at) as month, COUNT(*)::int as count
      FROM tickets WHERE created_at >= ${twelveMonthsAgo}
      GROUP BY month ORDER BY month ASC
    ` as any[];

    // Most active users
    const activeUsers = await this.prisma.ticket.groupBy({
      by: ['createdById'], _count: true, where,
      orderBy: { _count: { createdById: 'desc' } }, take: 10,
    });

    return {
      total, byStatus, byPriority, ticketsPerDept, overdue,
      monthlyTickets: monthlyRaw,
      activeUsers,
      overdueRate: total > 0 ? ((overdue / total) * 100).toFixed(1) : '0',
    };
  }

  async getTeamPerformance(user: any) {
    const isAdmin = user.globalRole === 'GLOBAL_ADMIN';
    const deptId = user.departmentId;

    // Get all agents in department (or all if admin)
    const agentWhere: any = { isActive: true };
    if (!isAdmin) agentWhere.departmentId = deptId;

    const agents = await this.prisma.user.findMany({
      where: agentWhere,
      select: { id: true, firstName: true, lastName: true, avatar: true, departmentId: true },
    });

    const deptFilter: any = isAdmin ? {} : {
      OR: [{ toDepartmentId: deptId }, { fromDepartmentId: deptId }],
    };
    const openFilter = { status: { notIn: ['CLOSED', 'REJECTED', 'DRAFT'] as any } };
    const now = new Date();

    // Per-agent metrics
    const agentMetrics = await Promise.all(agents.map(async (agent) => {
      const [
        assignedOpen, assignedTotal, assignedClosed, createdOpen,
        closedTickets, overdueActive,
      ] = await Promise.all([
        // Open tickets assigned
        this.prisma.ticket.count({ where: { assignedToId: agent.id, ...deptFilter, ...openFilter } }),
        // Total assigned (all time)
        this.prisma.ticket.count({ where: { assignedToId: agent.id, ...deptFilter } }),
        // Assigned & closed
        this.prisma.ticket.count({ where: { assignedToId: agent.id, ...deptFilter, status: { in: ['CLOSED'] as any } } }),
        // Created & still open
        this.prisma.ticket.count({ where: { createdById: agent.id, ...deptFilter, ...openFilter } }),
        // Closed with resolution data
        this.prisma.ticket.findMany({
          where: { assignedToId: agent.id, ...deptFilter, closedAt: { not: null } },
          select: { createdAt: true, closedAt: true, slaResolutionDeadline: true },
          orderBy: { closedAt: 'desc' }, take: 100,
        }),
        // Overdue active tickets
        this.prisma.ticket.count({
          where: { assignedToId: agent.id, ...deptFilter, ...openFilter, slaResolutionDeadline: { lt: now } },
        }),
      ]);

      // Calculate SLA compliance & avg resolution
      let slaMet = 0, slaBreached = 0, totalResHours = 0;
      for (const t of closedTickets) {
        if (t.closedAt) {
          totalResHours += (t.closedAt.getTime() - t.createdAt.getTime()) / 3600000;
          if (t.slaResolutionDeadline) {
            if (t.closedAt <= t.slaResolutionDeadline) slaMet++;
            else slaBreached++;
          }
        }
      }
      const avgResolutionHours = closedTickets.length > 0 ? Math.round((totalResHours / closedTickets.length) * 10) / 10 : 0;
      const slaRate = (slaMet + slaBreached) > 0 ? Math.round((slaMet / (slaMet + slaBreached)) * 100) / 100 : 1;
      const resolutionRate = assignedTotal > 0 ? Math.round((assignedClosed / assignedTotal) * 100) / 100 : 0;

      // Workload score: weighted combination of open + created
      const workloadScore = assignedOpen * 2 + createdOpen * 0.5;

      // Efficiency: inverse of avg resolution (lower is better), normalized
      const efficiency = avgResolutionHours > 0 ? Math.min(1, 24 / avgResolutionHours) : 0;

      return {
        id: agent.id,
        name: `${agent.firstName} ${agent.lastName}`,
        avatar: agent.avatar,
        assignedOpen,
        createdOpen,
        assignedClosed,
        assignedTotal,
        overdueActive,
        slaRate,
        avgResolutionHours,
        resolutionRate,
        workloadScore: Math.round(workloadScore * 10) / 10,
        efficiency: Math.round(efficiency * 100) / 100,
      };
    }));

    // Operational status of open assigned tickets
    const openAssigned = await this.prisma.ticket.findMany({
      where: { ...deptFilter, ...openFilter, assignedToId: { not: null } },
      select: { status: true, slaResolutionDeadline: true },
    });

    let okCount = 0, atRiskCount = 0, overdueCount = 0, pausedCount = 0;
    for (const t of openAssigned) {
      if (t.status === 'WAITING_REPLY') { pausedCount++; continue; }
      if (!t.slaResolutionDeadline) { okCount++; continue; }
      const deadline = new Date(t.slaResolutionDeadline);
      const hoursLeft = (deadline.getTime() - now.getTime()) / 3600000;
      if (hoursLeft < 0) overdueCount++;
      else if (hoursLeft < 8) atRiskCount++;
      else okCount++;
    }

    return {
      agents: agentMetrics.filter(a => a.assignedTotal > 0 || a.createdOpen > 0),
      operationalStatus: { ok: okCount, atRisk: atRiskCount, overdue: overdueCount, paused: pausedCount },
    };
  }

  async exportData(params: { format: 'csv' | 'excel'; departmentId?: string; dateFrom?: string; dateTo?: string }) {
    const where: any = {};
    if (params.departmentId) where.toDepartmentId = params.departmentId;
    if (params.dateFrom) where.createdAt = { gte: new Date(params.dateFrom) };
    if (params.dateTo) where.createdAt = { ...where.createdAt, lte: new Date(params.dateTo) };

    const tickets = await this.prisma.ticket.findMany({
      where,
      include: { fromDepartment: true, toDepartment: true, createdBy: true, assignedTo: true },
      orderBy: { createdAt: 'desc' },
    });

    return tickets.map(t => ({
      ticketNumber: t.ticketNumber,
      title: t.title,
      status: t.status,
      priority: t.priority,
      fromDepartment: t.fromDepartment.name,
      toDepartment: t.toDepartment.name,
      createdBy: `${t.createdBy.firstName} ${t.createdBy.lastName}`,
      assignedTo: t.assignedTo ? `${t.assignedTo.firstName} ${t.assignedTo.lastName}` : '',
      createdAt: t.createdAt.toISOString(),
      closedAt: t.closedAt?.toISOString() || '',
    }));
  }
}