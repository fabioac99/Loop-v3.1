'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Building2, Users, Ticket, Loader2 } from 'lucide-react';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.getDepartments().then(setDepartments).finally(() => setLoading(false)); }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-primary" size={24} /></div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Departments</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map(d => (
          <div key={d.id} className="bg-card border border-border rounded-2xl p-5 hover:border-primary/30 transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: d.color + '20' }}>
                <Building2 size={18} style={{ color: d.color }} />
              </div>
              <div>
                <h3 className="font-semibold">{d.name}</h3>
                <p className="text-xs text-muted-foreground">{d.slug}</p>
              </div>
            </div>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Users size={14} /> {d._count?.users || 0} users</span>
              <span className="flex items-center gap-1"><Ticket size={14} /> {d._count?.toTickets || 0} tickets</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
