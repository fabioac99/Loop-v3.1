'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { Ticket, Clock, AlertTriangle, CheckCircle2, ArrowUpRight, Loader2 } from 'lucide-react';

const statusColors: Record<string, string> = {
  OPEN: 'bg-blue-500/10 text-blue-500', IN_PROGRESS: 'bg-amber-500/10 text-amber-500',
  WAITING_REPLY: 'bg-purple-500/10 text-purple-500', APPROVED: 'bg-emerald-500/10 text-emerald-500',
  REJECTED: 'bg-red-500/10 text-red-500', CLOSED: 'bg-zinc-500/10 text-zinc-400',
};
const priorityColors: Record<string, string> = {
  LOW: 'text-zinc-400', NORMAL: 'text-blue-400', HIGH: 'text-amber-400', URGENT: 'text-red-400',
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDashboard().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-primary" size={24} /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {user?.firstName}</h1>
        <p className="text-muted-foreground text-sm mt-1">Here's what's happening in your workspace</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'My Open Tickets', value: data?.myOpen || 0, icon: Ticket, color: 'text-blue-400' },
          { label: 'Waiting for Me', value: data?.waitingForMe || 0, icon: Clock, color: 'text-amber-400' },
          { label: 'Department Tickets', value: data?.departmentTickets || 0, icon: CheckCircle2, color: 'text-emerald-400' },
          { label: 'Overdue', value: data?.overdueCount || 0, icon: AlertTriangle, color: 'text-red-400' },
        ].map((stat) => (
          <div key={stat.label} className="bg-card border border-border rounded-2xl p-5 hover:border-primary/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <stat.icon className={stat.color} size={20} />
              <span className={`text-2xl font-bold ${stat.value > 0 && stat.label === 'Overdue' ? 'text-red-400' : ''}`}>{stat.value}</span>
            </div>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* By Status */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="text-sm font-semibold mb-4">Tickets by Status</h3>
          <div className="space-y-3">
            {data?.byStatus?.map((s: any) => (
              <div key={s.status} className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${statusColors[s.status] || ''}`}>{s.status.replace('_', ' ')}</span>
                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary/60 rounded-full transition-all" style={{ width: `${Math.max(5, (s._count / Math.max(1, data?.myOpen + data?.waitingForMe)) * 100)}%` }} />
                </div>
                <span className="text-sm font-mono text-muted-foreground w-8 text-right">{s._count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* By Priority */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="text-sm font-semibold mb-4">Tickets by Priority</h3>
          <div className="space-y-3">
            {data?.byPriority?.map((p: any) => (
              <div key={p.priority} className="flex items-center gap-3">
                <span className={`text-xs font-medium w-16 ${priorityColors[p.priority] || ''}`}>{p.priority}</span>
                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary/60 rounded-full transition-all" style={{ width: `${Math.max(5, (p._count / Math.max(1, data?.myOpen + data?.waitingForMe)) * 100)}%` }} />
                </div>
                <span className="text-sm font-mono text-muted-foreground w-8 text-right">{p._count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent tickets */}
      <div className="bg-card border border-border rounded-2xl">
        <div className="flex items-center justify-between p-5 pb-0">
          <h3 className="text-sm font-semibold">Recently Updated</h3>
          <Link href="/dashboard/tickets" className="text-xs text-primary hover:underline flex items-center gap-1">
            View all <ArrowUpRight size={12} />
          </Link>
        </div>
        <div className="divide-y divide-border">
          {data?.recentlyUpdated?.map((ticket: any) => (
            <Link key={ticket.id} href={`/dashboard/tickets/${ticket.id}`} className="flex items-center gap-4 p-4 px-5 hover:bg-accent/50 transition-all">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-muted-foreground">{ticket.ticketNumber}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColors[ticket.status] || ''}`}>{ticket.status.replace('_', ' ')}</span>
                </div>
                <p className="text-sm font-medium truncate">{ticket.title}</p>
              </div>
              <div className="text-right shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ticket.fromDepartment?.color }} />
                  <span className="text-xs text-muted-foreground">{ticket.fromDepartment?.name}</span>
                  <span className="text-xs text-muted-foreground mx-1">→</span>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ticket.toDepartment?.color }} />
                  <span className="text-xs text-muted-foreground">{ticket.toDepartment?.name}</span>
                </div>
              </div>
            </Link>
          ))}
          {(!data?.recentlyUpdated?.length) && (
            <p className="p-8 text-center text-sm text-muted-foreground">No tickets yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
