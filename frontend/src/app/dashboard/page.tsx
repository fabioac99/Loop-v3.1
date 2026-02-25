'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useNotificationStore } from '@/stores/notifications';
import { useSocketEvent } from '@/hooks/useSocket';
import {
  Ticket, Clock, AlertTriangle, CheckCircle2, ArrowUpRight, Loader2,
  Eye, Bell, Building2, User, UserCheck, Inbox, X, TrendingUp, TrendingDown,
  Timer, ShieldCheck, BarChart3, Users, Activity, Minus, Mail,
} from 'lucide-react';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-zinc-500/10 text-zinc-500',
  OPEN: 'bg-blue-500/10 text-blue-500', IN_PROGRESS: 'bg-amber-500/10 text-amber-500',
  WAITING_REPLY: 'bg-purple-500/10 text-purple-500', APPROVED: 'bg-emerald-500/10 text-emerald-500',
  REJECTED: 'bg-red-500/10 text-red-500', CLOSED: 'bg-zinc-500/10 text-zinc-400',
};
const statusBarColors: Record<string, string> = {
  OPEN: '#3b82f6', IN_PROGRESS: '#f59e0b', WAITING_REPLY: '#a855f7',
  APPROVED: '#10b981', REJECTED: '#ef4444', CLOSED: '#71717a', DRAFT: '#a1a1aa',
};
const priorityColors: Record<string, string> = { LOW: '#a1a1aa', NORMAL: '#60a5fa', HIGH: '#fbbf24', URGENT: '#f87171' };
const priorityDots: Record<string, string> = { LOW: 'bg-zinc-400', NORMAL: 'bg-blue-400', HIGH: 'bg-amber-400', URGENT: 'bg-red-400' };

/* ============ KPI Popup ============ */
function KpiPopup({ open, label, kpiType, scope, onClose }: { open: boolean; label: string; kpiType: string; scope: string; onClose: () => void }) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => { if (open && kpiType) { setLoading(true); api.getKpiTickets(kpiType, scope).then(setTickets).finally(() => setLoading(false)); } }, [open, kpiType, scope]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-lg font-semibold">{label}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-primary" size={24} /></div>
            : tickets.length === 0 ? <p className="text-center text-sm text-muted-foreground py-12">No tickets found</p>
              : <div className="divide-y divide-border">{tickets.map(ticket => (
                <Link key={ticket.id} href={`/dashboard/tickets/${ticket.id}`} onClick={onClose} className="flex items-center gap-3 px-6 py-3 hover:bg-accent/50 transition-all">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${priorityDots[ticket.priority] || 'bg-zinc-400'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-xs text-muted-foreground">{ticket.ticketNumber}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColors[ticket.status] || ''}`}>{ticket.status.replace('_', ' ')}</span>
                    </div>
                    <p className="text-sm font-medium truncate">{ticket.title}</p>
                  </div>
                </Link>
              ))}</div>}
        </div>
      </div>
    </div>
  );
}

/* ============ Stat Card ============ */
function StatCard({ label, value, icon: Icon, color, sub, onClick }: { label: string; value: number | string; icon: any; color: string; sub?: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`bg-card border border-border rounded-2xl p-4 hover:border-primary/30 transition-all text-left w-full ${onClick ? 'cursor-pointer hover:shadow-lg hover:shadow-primary/5' : 'cursor-default'}`}>
      <div className="flex items-center justify-between mb-2">
        <Icon className={color} size={18} />
        {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </button>
  );
}

/* ============ Mini Bar Chart (CSS only) ============ */
function MiniBarChart({ data, colorMap, labelMap }: { data: any[]; colorMap: Record<string, string>; labelMap?: Record<string, string> }) {
  const total = data.reduce((s, d) => s + d._count, 0) || 1;
  return (
    <div className="space-y-2.5">
      {data.map((d: any) => {
        const key = d.status || d.priority;
        const pct = (d._count / total) * 100;
        return (
          <div key={key} className="group">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium">{(labelMap?.[key] || key).replace('_', ' ')}</span>
              <span className="text-xs text-muted-foreground font-mono">{d._count}</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500 group-hover:opacity-80"
                style={{ width: `${Math.max(3, pct)}%`, backgroundColor: colorMap[key] || '#6366f1' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============ Sparkline (SVG) ============ */
function Sparkline({ data, width = 200, height = 40, color = '#6366f1' }: { data: number[]; width?: number; height?: number; color?: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * (height - 4) - 2}`).join(' ');
  const areaPoints = `0,${height} ${points} ${width},${height}`;
  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs><linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.2" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <polygon points={areaPoints} fill={`url(#sg-${color.replace('#', '')})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ============ Donut Chart (SVG) ============ */
function DonutChart({ data, colorMap, size = 120 }: { data: { key: string; count: number }[]; colorMap: Record<string, string>; size?: number }) {
  const total = data.reduce((s, d) => s + d.count, 0) || 1;
  const r = (size - 12) / 2;
  const cx = size / 2, cy = size / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        {data.map(d => {
          const pct = d.count / total;
          const dash = pct * circumference;
          const thisOffset = offset;
          offset += dash;
          return (
            <circle key={d.key} cx={cx} cy={cy} r={r} fill="none"
              stroke={colorMap[d.key] || '#6366f1'} strokeWidth="10"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-thisOffset} strokeLinecap="round"
              transform={`rotate(-90 ${cx} ${cy})`}
              className="transition-all duration-500" />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center flex-col">
        <span className="text-lg font-bold">{total}</span>
        <span className="text-[9px] text-muted-foreground">total</span>
      </div>
    </div>
  );
}

/* ============ Agent Workload ============ */
function AgentWorkload({ agents }: { agents: any[] }) {
  if (!agents?.length) return null;
  const max = Math.max(...agents.map(a => a.count), 1);
  return (
    <div className="space-y-3">
      {agents.slice(0, 8).map(a => (
        <div key={a.id} className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
            {a.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium truncate">{a.name}</span>
              <span className="text-xs font-mono text-muted-foreground">{a.count}</span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${(a.count / max) * 100}%` }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============ Trend Chart ============ */
function TrendChart({ data }: { data: { date: string; created: number; closed: number }[] }) {
  if (!data?.length) return null;
  const maxVal = Math.max(...data.map(d => Math.max(d.created, d.closed)), 1);
  const barW = Math.max(2, Math.floor(320 / data.length) - 1);
  return (
    <div>
      <div className="flex items-center gap-4 mb-3">
        <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className="w-2.5 h-2.5 rounded-sm bg-primary/70" /> Created</span>
        <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/70" /> Closed</span>
      </div>
      <div className="flex items-end gap-[1px] h-24">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-[1px] group relative" title={`${d.date}: ${d.created} created, ${d.closed} closed`}>
            <div className="w-full bg-primary/60 rounded-t-sm transition-all group-hover:bg-primary" style={{ height: `${Math.max(1, (d.created / maxVal) * 80)}px` }} />
            <div className="w-full bg-emerald-500/50 rounded-b-sm transition-all group-hover:bg-emerald-500" style={{ height: `${Math.max(1, (d.closed / maxVal) * 80)}px` }} />
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2">
        <span className="text-[9px] text-muted-foreground">{data[0]?.date?.slice(5)}</span>
        <span className="text-[9px] text-muted-foreground">{data[data.length - 1]?.date?.slice(5)}</span>
      </div>
    </div>
  );
}

/* ============ Department Breakdown ============ */
function DeptBreakdown({ depts }: { depts: any[] }) {
  if (!depts?.length) return null;
  const total = depts.reduce((s, d) => s + d.count, 0) || 1;
  return (
    <div className="space-y-2.5">
      {depts.map(d => (
        <div key={d.id}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color || '#6366f1' }} />
              <span className="text-xs font-medium">{d.name}</span>
            </div>
            <span className="text-xs font-mono text-muted-foreground">{d.count} <span className="text-[10px]">({Math.round((d.count / total) * 100)}%)</span></span>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${(d.count / total) * 100}%`, backgroundColor: d.color || '#6366f1' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============ Recent Tickets ============ */
function RecentTickets({ tickets, unreadTicketIds }: { tickets: any[]; unreadTicketIds: string[] }) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between p-5 pb-3">
        <h3 className="text-sm font-semibold">Recently Updated</h3>
        <Link href="/dashboard/tickets" className="text-xs text-primary hover:underline flex items-center gap-1">View all <ArrowUpRight size={12} /></Link>
      </div>
      <div className="divide-y divide-border">
        {tickets?.map((t: any) => {
          const hasUnread = unreadTicketIds.includes(t.id);
          return (
            <Link key={t.id} href={`/dashboard/tickets/${t.id}`}
              className={`flex items-center gap-4 p-4 px-5 hover:bg-accent/50 transition-all relative ${hasUnread ? 'bg-primary/[0.06] border-l-[3px] border-l-primary' : 'border-l-[3px] border-l-transparent'}`}>
              {hasUnread ? (
                <div className="relative shrink-0"><div className="w-2.5 h-2.5 rounded-full bg-primary" /><div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-primary animate-ping opacity-40" /></div>
              ) : (
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${priorityDots[t.priority] || 'bg-zinc-400'}`} />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  {hasUnread && <span className="flex items-center gap-1 px-1.5 py-0.5 bg-primary/15 text-primary rounded text-[10px] font-semibold"><Bell size={10} className="fill-primary" /> NEW</span>}
                  <span className="font-mono text-xs text-muted-foreground">{t.ticketNumber}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColors[t.status] || ''}`}>{t.status.replace('_', ' ')}</span>
                </div>
                <p className={`text-sm truncate ${hasUnread ? 'font-semibold' : 'font-medium'}`}>{t.title}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.toDepartment?.color }} />
                <span>{t.toDepartment?.name}</span>
                {t.assignedTo && <span className="text-[10px] ml-1">→ {t.assignedTo.firstName}</span>}
              </div>
            </Link>
          );
        })}
        {(!tickets?.length) && <p className="p-8 text-center text-sm text-muted-foreground">No tickets yet</p>}
      </div>
    </div>
  );
}

/* ============ MAIN DASHBOARD ============ */
export default function DashboardPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'personal' | 'department'>('personal');
  const { unreadTicketIds, fetchUnreadTicketIds } = useNotificationStore();
  const [kpiOpen, setKpiOpen] = useState(false);
  const [kpiLabel, setKpiLabel] = useState('');
  const [kpiType, setKpiType] = useState('');

  const refreshDashboard = () => { api.getDashboard().then(setData); };
  useEffect(() => { refreshDashboard(); setLoading(false); fetchUnreadTicketIds(); }, []);

  // Real-time: refresh dashboard KPIs when tickets change
  useSocketEvent('tickets:refresh', refreshDashboard);
  useSocketEvent('ticket:created', refreshDashboard);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-primary" size={24} /></div>;

  const hasDeptView = data?.isDeptHead && data?.department;
  const p = data?.personal || {};
  const d = data?.department || {};
  const openKpi = (label: string, type: string) => { setKpiLabel(label); setKpiType(type); setKpiOpen(true); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {user?.firstName}</h1>
          <p className="text-muted-foreground text-sm mt-1">Here&apos;s what&apos;s happening in your workspace</p>
        </div>
        {hasDeptView && (
          <div className="flex gap-2">
            <button onClick={async () => { try { await api.generateReport('daily_summary'); alert('Daily report generated! View it in Reports page.'); } catch (e: any) { alert(e.message); } }}
              className="text-[11px] px-3 py-1.5 rounded-lg border border-border hover:bg-accent text-muted-foreground flex items-center gap-1.5">
              <Mail size={12} /> Daily Report
            </button>
            <button onClick={async () => { try { await api.generateReport('weekly_summary'); alert('Weekly report generated! View it in Reports page.'); } catch (e: any) { alert(e.message); } }}
              className="text-[11px] px-3 py-1.5 rounded-lg border border-border hover:bg-accent text-muted-foreground flex items-center gap-1.5">
              <Mail size={12} /> Weekly Report
            </button>
          </div>
        )}
      </div>

      {hasDeptView && (
        <div className="flex gap-1 bg-secondary rounded-xl p-1 w-fit">
          <button onClick={() => setView('personal')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === 'personal' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}><User size={15} /> My Tickets</button>
          <button onClick={() => setView('department')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === 'department' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}><Building2 size={15} /> Department</button>
        </div>
      )}

      {/* ====== PERSONAL VIEW ====== */}
      {view === 'personal' && (<>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <StatCard label="My Open" value={p.myOpen || 0} icon={Ticket} color="text-blue-400" onClick={() => p.myOpen > 0 && openKpi('My Open Tickets', 'myOpen')} />
          <StatCard label="Assigned to Me" value={p.assignedToMe || 0} icon={UserCheck} color="text-amber-400" onClick={() => p.assignedToMe > 0 && openKpi('Assigned to Me', 'assignedToMe')} />
          <StatCard label="Watching" value={p.watchingCount || 0} icon={Eye} color="text-purple-400" onClick={() => p.watchingCount > 0 && openKpi('Watching', 'watchingCount')} />
          <StatCard label="Overdue" value={p.overdueCount || 0} icon={AlertTriangle} color="text-red-400" onClick={() => p.overdueCount > 0 && openKpi('Overdue', 'overdueCount')} />
          <StatCard label="Closed This Week" value={p.closedThisWeek || 0} icon={CheckCircle2} color="text-emerald-400" />
          <StatCard label="Avg Resolution" value={p.avgResolutionHours ? `${p.avgResolutionHours}h` : '—'} icon={Timer} color="text-cyan-400" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-sm font-semibold mb-4">By Status</h3>
            <div className="flex items-center gap-6">
              <DonutChart
                data={(p.byStatus || []).map((s: any) => ({ key: s.status, count: s._count }))}
                colorMap={statusBarColors} size={110} />
              <div className="flex-1"><MiniBarChart data={p.byStatus || []} colorMap={statusBarColors} /></div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-sm font-semibold mb-4">By Priority</h3>
            <div className="flex items-center gap-6">
              <DonutChart
                data={(p.byPriority || []).map((pp: any) => ({ key: pp.priority, count: pp._count }))}
                colorMap={priorityColors} size={110} />
              <div className="flex-1"><MiniBarChart data={p.byPriority || []} colorMap={priorityColors} /></div>
            </div>
          </div>
        </div>

        <RecentTickets tickets={p.recentlyUpdated || []} unreadTicketIds={unreadTicketIds} />
      </>)}

      {/* ====== DEPARTMENT VIEW ====== */}
      {view === 'department' && hasDeptView && (<>
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3">
          <StatCard label="Open" value={d.openTickets || 0} icon={Ticket} color="text-blue-400" onClick={() => d.openTickets > 0 && openKpi('Open Tickets', 'openTickets')} />
          <StatCard label="Waiting Reply" value={d.waitingReply || 0} icon={Clock} color="text-amber-400" onClick={() => d.waitingReply > 0 && openKpi('Waiting Reply', 'waitingReply')} />
          <StatCard label="Unassigned" value={d.unassigned || 0} icon={Inbox} color="text-orange-400" onClick={() => d.unassigned > 0 && openKpi('Unassigned', 'unassigned')} />
          <StatCard label="Overdue" value={d.overdueCount || 0} icon={AlertTriangle} color="text-red-400" onClick={() => d.overdueCount > 0 && openKpi('Overdue', 'overdueCount')} />
          <StatCard label="Created (7d)" value={d.createdThisWeek || 0} icon={TrendingUp} color="text-indigo-400" />
          <StatCard label="Closed (7d)" value={d.closedThisWeek || 0} icon={CheckCircle2} color="text-emerald-400" />
          <StatCard label="Avg Resolution" value={d.avgResolutionHours ? `${d.avgResolutionHours}h` : '—'} icon={Timer} color="text-cyan-400" />
          <StatCard label="SLA Compliance" value={`${d.slaComplianceRate ?? 100}%`} icon={ShieldCheck} color={d.slaComplianceRate >= 90 ? 'text-emerald-400' : d.slaComplianceRate >= 70 ? 'text-amber-400' : 'text-red-400'}
            sub={`${d.slaMetCount || 0}✓ ${d.slaBreachedCount || 0}✗`} />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-sm font-semibold mb-4">By Status</h3>
            <div className="flex items-center gap-6">
              <DonutChart
                data={(d.byStatus || []).map((s: any) => ({ key: s.status, count: s._count }))}
                colorMap={statusBarColors} size={110} />
              <div className="flex-1"><MiniBarChart data={d.byStatus || []} colorMap={statusBarColors} /></div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-sm font-semibold mb-4">By Priority</h3>
            <div className="flex items-center gap-6">
              <DonutChart
                data={(d.byPriority || []).map((pp: any) => ({ key: pp.priority, count: pp._count }))}
                colorMap={priorityColors} size={110} />
              <div className="flex-1"><MiniBarChart data={d.byPriority || []} colorMap={priorityColors} /></div>
            </div>
          </div>
        </div>

        {/* Trend + Agent + Dept Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-2xl p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Activity size={14} /> 30-Day Ticket Trend</h3>
              <span className="text-[10px] text-muted-foreground">{d.totalTickets} total</span>
            </div>
            <TrendChart data={d.dailyTrend || []} />
          </div>
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-4"><Users size={14} /> Agent Workload</h3>
            <AgentWorkload agents={d.agentWorkload || []} />
            {(!d.agentWorkload?.length) && <p className="text-xs text-muted-foreground text-center py-4">No assigned tickets</p>}
          </div>
        </div>

        {/* Dept Breakdown (admin only) */}
        {d.deptBreakdown?.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-4"><Building2 size={14} /> Open Tickets by Department</h3>
            <DeptBreakdown depts={d.deptBreakdown} />
          </div>
        )}

        {/* SLA Gauge */}
        {(d.slaMetCount > 0 || d.slaBreachedCount > 0) && (
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-4"><ShieldCheck size={14} /> SLA Performance</h3>
            <div className="flex items-center gap-8">
              <div className="text-center">
                <div className="relative w-24 h-24">
                  <svg className="w-24 h-24 -rotate-90">
                    <circle cx="48" cy="48" r="40" fill="none" stroke="currentColor" className="text-secondary" strokeWidth="8" />
                    <circle cx="48" cy="48" r="40" fill="none" stroke={d.slaComplianceRate >= 90 ? '#10b981' : d.slaComplianceRate >= 70 ? '#f59e0b' : '#ef4444'}
                      strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={`${(d.slaComplianceRate / 100) * 251.3} 251.3`} />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">{d.slaComplianceRate}%</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Compliance</p>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-4">
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-emerald-400">{d.slaMetCount}</p>
                  <p className="text-[10px] text-muted-foreground">Within SLA</p>
                </div>
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-red-400">{d.slaBreachedCount}</p>
                  <p className="text-[10px] text-muted-foreground">SLA Breached</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <RecentTickets tickets={d.recentlyUpdated || []} unreadTicketIds={unreadTicketIds} />
      </>)}

      <KpiPopup open={kpiOpen} label={kpiLabel} kpiType={kpiType} scope={view} onClose={() => setKpiOpen(false)} />
    </div>
  );
}