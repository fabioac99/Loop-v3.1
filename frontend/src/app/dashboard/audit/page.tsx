'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Loader2, Shield } from 'lucide-react';
import PermissionGate from '@/components/common/PermissionGate';

function AuditPageContent() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    api.getAuditLogs({ page: String(page) }).then(d => { setLogs(d.data); setTotal(d.total); }).finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3"><Shield size={24} className="text-primary" /><h1 className="text-2xl font-bold">Audit Log</h1></div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loading ? <div className="flex items-center justify-center h-32"><Loader2 className="animate-spin" size={20} /></div> : (
          <div className="divide-y divide-border">
            {logs.map(log => (
              <div key={log.id} className="p-4 hover:bg-accent/30">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 bg-secondary rounded text-xs font-mono">{log.action}</span>
                  <span className="text-sm">{log.user?.firstName} {log.user?.lastName}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{new Date(log.createdAt).toLocaleString()}</span>
                </div>
                {log.metadata && <p className="text-xs text-muted-foreground mt-1 font-mono">{JSON.stringify(log.metadata)}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuditPage() {
  return <PermissionGate permission="audit.view"><AuditPageContent /></PermissionGate>;
}
