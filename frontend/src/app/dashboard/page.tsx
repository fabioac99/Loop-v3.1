'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useNotificationStore } from '@/stores/notifications';
import {
  Ticket, Clock, AlertTriangle, CheckCircle2, ArrowUpRight, Loader2,
  Eye, Bell, Building2, User, UserCheck, Inbox, X,
} from 'lucide-react';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-zinc-500/10 text-zinc-500',
  OPEN: 'bg-blue-500/10 text-blue-500', IN_PROGRESS: 'bg-amber-500/10 text-amber-500',
  WAITING_REPLY: 'bg-purple-500/10 text-purple-500', APPROVED: 'bg-emerald-500/10 text-emerald-500',
  REJECTED: 'bg-red-500/10 text-red-500', CLOSED: 'bg-zinc-500/10 text-zinc-400',
};
const priorityDots: Record<string, string> = { LOW: 'bg-zinc-400', NORMAL: 'bg-blue-400', HIGH: 'bg-amber-400', URGENT: 'bg-red-400' };
const priorityColors: Record<string, string> = { LOW: 'text-zinc-400', NORMAL: 'text-blue-400', HIGH: 'text-amber-400', URGENT: 'text-red-400' };

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
          {loading ? (<div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-primary" size={24} /></div>
          ) : tickets.length === 0 ? (<p className="text-center text-sm text-muted-foreground py-12">No tickets found</p>
          ) : (<div className="divide-y divide-border">{tickets.map((ticket) => (
            <Link key={ticket.id} href={`/dashboard/tickets/${ticket.id}`} onClick={onClose} className="flex items-center gap-3 px-6 py-3 hover:bg-accent/50 transition-all">
              <div className={`w-2 h-2 rounded-full shrink-0 ${priorityDots[ticket.priority] || 'bg-zinc-400'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-mono text-xs text-muted-foreground">{ticket.ticketNumber}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColors[ticket.status] || ''}`}>{ticket.status.replace('_', ' ')}</span>
                </div>
                <p className="text-sm font-medium truncate">{ticket.title}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: ticket.toDepartment?.color }} />{ticket.toDepartment?.name}</div>
                {ticket.assignedTo && <span>{ticket.assignedTo.firstName} {ticket.assignedTo.lastName?.[0]}.</span>}
              </div>
            </Link>
          ))}</div>)}
        </div>
        <div className="px-6 py-3 border-t border-border shrink-0 text-right"><span className="text-xs text-muted-foreground">{tickets.length} ticket{tickets.length !== 1 ? 's' : ''}</span></div>
      </div>
    </div>
  );
}

function StatCard({ stat, onClick }: { stat: { label: string; value: number; icon: any; color: string; kpiType: string }; onClick: (l: string, t: string) => void }) {
  return (
    <button onClick={() => stat.value > 0 && onClick(stat.label, stat.kpiType)}
      className={`bg-card border border-border rounded-2xl p-5 hover:border-primary/30 transition-all text-left w-full ${stat.value > 0 ? 'cursor-pointer hover:shadow-lg hover:shadow-primary/5' : 'cursor-default'}`}>
      <div className="flex items-center justify-between mb-3">
        <stat.icon className={stat.color} size={20} />
        <span className={`text-2xl font-bold ${stat.value > 0 && stat.label === 'Overdue' ? 'text-red-400' : ''}`}>{stat.value}</span>
      </div>
      <p className="text-sm text-muted-foreground">{stat.label}</p>
    </button>
  );
}

function StatsRow({ stats, onStatClick }: { stats: { label: string; value: number; icon: any; color: string; kpiType: string }[]; onStatClick: (l: string, t: string) => void }) {
  return (<div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(stats.length, 5)}, 1fr)` }}>{stats.map(s => <StatCard key={s.label} stat={s} onClick={onStatClick} />)}</div>);
}

function ChartsRow({ byStatus, byPriority }: { byStatus: any[]; byPriority: any[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="text-sm font-semibold mb-4">By Status</h3>
        <div className="space-y-3">{byStatus?.map((s: any) => { const t = byStatus.reduce((a: number, x: any) => a + x._count, 0) || 1; return (
          <Link key={s.status} href={`/dashboard/tickets?status=${s.status}`} className="flex items-center gap-3 hover:bg-accent/50 rounded-lg px-2 py-1 -mx-2 transition-all cursor-pointer group">
            <span className={`px-2 py-0.5 rounded-md text-xs font-medium w-28 text-center ${statusColors[s.status] || ''}`}>{s.status.replace('_', ' ')}</span>
            <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden"><div className="h-full bg-primary/60 rounded-full transition-all group-hover:bg-primary" style={{ width: `${Math.max(5, (s._count / t) * 100)}%` }} /></div>
            <span className="text-sm font-mono text-muted-foreground w-8 text-right">{s._count}</span>
          </Link>); })}</div>
      </div>
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="text-sm font-semibold mb-4">By Priority</h3>
        <div className="space-y-3">{byPriority?.map((p: any) => { const t = byPriority.reduce((a: number, x: any) => a + x._count, 0) || 1; return (
          <Link key={p.priority} href={`/dashboard/tickets?priority=${p.priority}`} className="flex items-center gap-3 hover:bg-accent/50 rounded-lg px-2 py-1 -mx-2 transition-all cursor-pointer group">
            <span className={`text-xs font-medium w-16 ${priorityColors[p.priority] || ''}`}>{p.priority}</span>
            <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden"><div className="h-full bg-primary/60 rounded-full transition-all group-hover:bg-primary" style={{ width: `${Math.max(5, (p._count / t) * 100)}%` }} /></div>
            <span className="text-sm font-mono text-muted-foreground w-8 text-right">{p._count}</span>
          </Link>); })}</div>
      </div>
    </div>
  );
}

function TicketRow({ ticket, hasUnread }: { ticket: any; hasUnread: boolean }) {
  return (
    <Link href={`/dashboard/tickets/${ticket.id}`} className={`flex items-center gap-4 p-4 px-5 hover:bg-accent/50 transition-all relative ${hasUnread ? 'bg-primary/[0.06] border-l-[3px] border-l-primary' : 'border-l-[3px] border-l-transparent'}`}>
      {hasUnread ? (<div className="relative shrink-0"><div className="w-2.5 h-2.5 rounded-full bg-primary" /><div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-primary animate-ping opacity-40" /></div>) : (<div className={`w-2.5 h-2.5 rounded-full shrink-0 ${priorityDots[ticket.priority] || 'bg-zinc-400'}`} />)}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {hasUnread && <span className="flex items-center gap-1 px-1.5 py-0.5 bg-primary/15 text-primary rounded text-[10px] font-semibold"><Bell size={10} className="fill-primary" /> NEW</span>}
          <span className="font-mono text-xs text-muted-foreground">{ticket.ticketNumber}</span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColors[ticket.status] || ''}`}>{ticket.status.replace('_', ' ')}</span>
        </div>
        <p className={`text-sm truncate ${hasUnread ? 'font-semibold text-foreground' : 'font-medium'}`}>{ticket.title}</p>
      </div>
      <div className="text-right shrink-0"><div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: ticket.fromDepartment?.color }} /><span className="text-xs text-muted-foreground">{ticket.fromDepartment?.name}</span><span className="text-xs text-muted-foreground mx-1">→</span><span className="w-2 h-2 rounded-full" style={{ backgroundColor: ticket.toDepartment?.color }} /><span className="text-xs text-muted-foreground">{ticket.toDepartment?.name}</span></div></div>
    </Link>
  );
}

function RecentTickets({ tickets, unreadTicketIds }: { tickets: any[]; unreadTicketIds: string[] }) {
  return (
    <div className="bg-card border border-border rounded-2xl">
      <div className="flex items-center justify-between p-5 pb-0"><h3 className="text-sm font-semibold">Recently Updated</h3><Link href="/dashboard/tickets" className="text-xs text-primary hover:underline flex items-center gap-1">View all <ArrowUpRight size={12} /></Link></div>
      <div className="divide-y divide-border">
        {tickets?.map((t: any) => <TicketRow key={t.id} ticket={t} hasUnread={unreadTicketIds.includes(t.id)} />)}
        {(!tickets?.length) && <p className="p-8 text-center text-sm text-muted-foreground">No tickets yet</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'personal' | 'department'>('personal');
  const { unreadTicketIds, fetchUnreadTicketIds } = useNotificationStore();
  const [kpiOpen, setKpiOpen] = useState(false);
  const [kpiLabel, setKpiLabel] = useState('');
  const [kpiType, setKpiType] = useState('');

  useEffect(() => { api.getDashboard().then(setData).finally(() => setLoading(false)); fetchUnreadTicketIds(); }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-primary" size={24} /></div>;

  const hasDeptView = data?.isDeptHead && data?.department;
  const p = data?.personal || {};
  const d = data?.department || {};
  const openKpi = (label: string, type: string) => { setKpiLabel(label); setKpiType(type); setKpiOpen(true); };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Welcome back, {user?.firstName}</h1><p className="text-muted-foreground text-sm mt-1">Here&apos;s what&apos;s happening in your workspace</p></div>

      {hasDeptView && (
        <div className="flex gap-1 bg-secondary rounded-xl p-1 w-fit">
          <button onClick={() => setView('personal')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === 'personal' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}><User size={15} /> My Tickets</button>
          <button onClick={() => setView('department')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === 'department' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}><Building2 size={15} /> Department</button>
        </div>
      )}

      {view === 'personal' && (<>
        <StatsRow onStatClick={openKpi} stats={[
          { label: 'My Open Tickets', value: p.myOpen || 0, icon: Ticket, color: 'text-blue-400', kpiType: 'myOpen' },
          { label: 'Assigned to Me', value: p.assignedToMe || 0, icon: UserCheck, color: 'text-amber-400', kpiType: 'assignedToMe' },
          { label: 'Watching', value: p.watchingCount || 0, icon: Eye, color: 'text-purple-400', kpiType: 'watchingCount' },
          { label: 'Overdue', value: p.overdueCount || 0, icon: AlertTriangle, color: 'text-red-400', kpiType: 'overdueCount' },
        ]} />
        <ChartsRow byStatus={p.byStatus || []} byPriority={p.byPriority || []} />
        <RecentTickets tickets={p.recentlyUpdated || []} unreadTicketIds={unreadTicketIds} />
      </>)}

      {view === 'department' && hasDeptView && (<>
        <StatsRow onStatClick={openKpi} stats={[
          { label: 'Open Tickets', value: d.openTickets || 0, icon: Ticket, color: 'text-blue-400', kpiType: 'openTickets' },
          { label: 'Waiting Reply', value: d.waitingReply || 0, icon: Clock, color: 'text-amber-400', kpiType: 'waitingReply' },
          { label: 'Unassigned', value: d.unassigned || 0, icon: Inbox, color: 'text-orange-400', kpiType: 'unassigned' },
          { label: 'Total Tickets', value: d.totalTickets || 0, icon: CheckCircle2, color: 'text-emerald-400', kpiType: 'totalTickets' },
          { label: 'Overdue', value: d.overdueCount || 0, icon: AlertTriangle, color: 'text-red-400', kpiType: 'overdueCount' },
        ]} />
        <ChartsRow byStatus={d.byStatus || []} byPriority={d.byPriority || []} />
        <RecentTickets tickets={d.recentlyUpdated || []} unreadTicketIds={unreadTicketIds} />
      </>)}

      <KpiPopup open={kpiOpen} label={kpiLabel} kpiType={kpiType} scope={view} onClose={() => setKpiOpen(false)} />
    </div>
  );
}
