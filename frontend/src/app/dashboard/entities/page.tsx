'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  Loader2, Plus, Edit2, Trash2, Search, X, Users, Truck, Building2,
} from 'lucide-react';
import PermissionGate from '@/components/common/PermissionGate';

/* ============================== ENTITY MODAL ============================== */
function EntityModal({
  open, type, entity, onClose, onSaved,
}: {
  open: boolean; type: 'client' | 'supplier'; entity: any | null;
  onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm(entity || { name: '', code: '', email: '', phone: '', address: '', taxId: '', notes: '' });
      setError('');
    }
  }, [open, entity]);

  if (!open) return null;

  const isEdit = !!entity?.id;
  const label = type === 'client' ? 'Client' : 'Supplier';

  const handleSave = async () => {
    if (!form.name?.trim()) { setError('Name is required'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        name: form.name,
        code: form.code || null,
        email: form.email || null,
        phone: form.phone || null,
        address: form.address || null,
        taxId: form.taxId || null,
        notes: form.notes || null,
      };
      if (isEdit) {
        if (type === 'client') await api.updateClient(entity.id, payload);
        else await api.updateSupplier(entity.id, payload);
      } else {
        if (type === 'client') await api.createClient(payload);
        else await api.createSupplier(payload);
      }
      onSaved(); onClose();
    } catch (e: any) {
      setError(e.message || 'Error saving');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg m-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-bold">{isEdit ? 'Edit' : 'New'} {label}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent text-muted-foreground"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name <span className="text-destructive">*</span></label>
              <input className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Company name" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Code</label>
              <input className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm" value={form.code || ''} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="CLT-001" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input type="email" className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm" value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tax ID / NIF</label>
            <input className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm" value={form.taxId || ''} onChange={e => setForm({ ...form, taxId: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            <input className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm" value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea className="w-full h-20 px-3 py-2 rounded-lg bg-secondary border border-border text-sm resize-none" value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
          {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-4 h-10 rounded-xl text-sm hover:bg-accent">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-5 h-10 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
              {saving && <Loader2 className="animate-spin" size={14} />}
              {isEdit ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================== ENTITY TABLE ============================== */
function EntityTable({
  type, icon: Icon, color,
}: {
  type: 'client' | 'supplier';
  icon: any;
  color: string;
}) {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<{ open: boolean; entity: any | null }>({ open: false, entity: null });

  const label = type === 'client' ? 'Clients' : 'Suppliers';
  const labelSingle = type === 'client' ? 'Client' : 'Supplier';

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params: any = { page: String(page), limit: '25' };
      if (search) params.search = search;
      const data = type === 'client' ? await api.getClients(params) : await api.getSuppliers(params);
      setItems(data.data); setTotal(data.total);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, [page, search, type]);

  const handleDelete = async (id: string) => {
    if (!confirm(`Deactivate this ${labelSingle.toLowerCase()}?`)) return;
    if (type === 'client') await api.deleteClient(id);
    else await api.deleteSupplier(id);
    fetchItems();
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
          <Icon size={16} className="text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold">{label}</h3>
          <p className="text-xs text-muted-foreground">{total} total</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
          <input
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder={`Search ${label.toLowerCase()}...`}
            className="h-9 pl-9 pr-3 w-52 rounded-lg bg-secondary border border-border text-xs"
          />
        </div>
        <button onClick={() => setModal({ open: true, entity: null })}
          className="flex items-center gap-1.5 h-9 px-4 bg-primary text-primary-foreground rounded-lg text-xs font-medium">
          <Plus size={14} /> New {labelSingle}
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-primary" size={20} /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Icon size={32} className="mx-auto mb-2 opacity-20" />
          <p className="text-sm">No {label.toLowerCase()} yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-accent/30">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Name</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Code</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Email</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Phone</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Tax ID</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-accent/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{item.code || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.email || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.phone || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.taxId || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => setModal({ open: true, entity: item })}
                        className="p-1.5 rounded hover:bg-accent text-muted-foreground"><Edit2 size={13} /></button>
                      <button onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded hover:bg-destructive/10 text-destructive"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {total > 25 && (
        <div className="p-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>Page {page} of {Math.ceil(total / 25)}</span>
          <div className="flex gap-1">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 rounded border border-border hover:bg-accent disabled:opacity-30">Prev</button>
            <button disabled={page >= Math.ceil(total / 25)} onClick={() => setPage(page + 1)} className="px-3 py-1 rounded border border-border hover:bg-accent disabled:opacity-30">Next</button>
          </div>
        </div>
      )}

      <EntityModal
        open={modal.open} type={type} entity={modal.entity}
        onClose={() => setModal({ open: false, entity: null })}
        onSaved={fetchItems}
      />
    </div>
  );
}

/* ============================== MAIN PAGE ============================== */
function EntitiesPageContent() {
  const [tab, setTab] = useState<'clients' | 'suppliers'>('clients');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Clients & Suppliers</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab('clients')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'clients' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Users size={15} /> Clients
        </button>
        <button
          onClick={() => setTab('suppliers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'suppliers' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Truck size={15} /> Suppliers
        </button>
      </div>

      {/* Content */}
      {tab === 'clients' && <EntityTable type="client" icon={Users} color="bg-blue-500" />}
      {tab === 'suppliers' && <EntityTable type="supplier" icon={Truck} color="bg-emerald-500" />}
    </div>
  );
}

export default function EntitiesPage() {
  return <PermissionGate permission="admin.access"><EntitiesPageContent /></PermissionGate>;
}
