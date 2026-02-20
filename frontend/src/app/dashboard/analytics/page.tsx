'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Loader2, Download } from 'lucide-react';
import PermissionGate from '@/components/common/PermissionGate';

function AnalyticsPageContent() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.getAnalytics().then(setData).finally(() => setLoading(false)); }, []);

  const handleExport = async () => {
    const exportData = await api.exportAnalytics({ format: 'csv' });
    const csv = [Object.keys(exportData[0] || {}).join(','), ...exportData.map((r: any) => Object.values(r).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'loop-analytics.csv'; a.click();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-primary" size={24} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <button onClick={handleExport} className="flex items-center gap-2 h-10 px-4 border border-border rounded-xl text-sm hover:bg-accent">
          <Download size={14} /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-sm text-muted-foreground">Total Tickets</p>
          <p className="text-3xl font-bold mt-1">{data?.total || 0}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-sm text-muted-foreground">Overdue</p>
          <p className="text-3xl font-bold mt-1 text-red-400">{data?.overdue || 0}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-sm text-muted-foreground">Overdue Rate</p>
          <p className="text-3xl font-bold mt-1">{data?.overdueRate || 0}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="text-sm font-semibold mb-4">Tickets by Department</h3>
          <div className="space-y-3">
            {data?.ticketsPerDept?.map((d: any) => (
              <div key={d.departmentId} className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.department?.color }} />
                <span className="text-sm flex-1">{d.department?.name}</span>
                <span className="font-mono text-sm">{d.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="text-sm font-semibold mb-4">Monthly Tickets</h3>
          <div className="space-y-2">
            {data?.monthlyTickets?.map((m: any, i: number) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-20">{new Date(m.month).toLocaleDateString('en', { month: 'short', year: '2-digit' })}</span>
                <div className="flex-1 h-4 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary/60 rounded-full" style={{ width: `${Math.max(5, (m.count / Math.max(1, ...data.monthlyTickets.map((x: any) => x.count))) * 100)}%` }} />
                </div>
                <span className="font-mono text-xs w-8 text-right">{m.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return <PermissionGate permission="analytics.view"><AnalyticsPageContent /></PermissionGate>;
}
