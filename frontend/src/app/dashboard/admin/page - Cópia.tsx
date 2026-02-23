'use client';
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'next/navigation';
import {
  Shield, Building2, Users, Ticket, Loader2, Plus, Save, X, Trash2, Edit2,
  ChevronRight, Lock, Palette, AlertTriangle, Clock, Check, ArrowUpDown
} from 'lucide-react';

type Tab = 'departments' | 'permissions' | 'statuses' | 'priorities';

export default function AdminPage() {
  const { user, hasPermission } = useAuthStore();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('departments');
  //  const { user } = useAuthStore();
  //  if (!hasPermission('admin.access')) {

  if (!hasPermission('admin.access')) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Access denied. Admin only.</div>;
  }

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'departments', label: 'Departments', icon: Building2 },
    { id: 'permissions', label: 'User Permissions', icon: Lock },
    { id: 'statuses', label: 'Statuses', icon: ArrowUpDown },
    { id: 'priorities', label: 'Priorities & SLA', icon: Clock },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield size={24} className="text-primary" />
        <h1 className="text-2xl font-bold">Admin Panel</h1>
      </div>

      <div className="flex gap-1 bg-secondary rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'departments' && <DepartmentsTab />}
      {tab === 'permissions' && <PermissionsTab />}
      {tab === 'statuses' && <StatusesTab />}
      {tab === 'priorities' && <PrioritiesTab />}
    </div>
  );
}

/* ============================== DEPARTMENTS TAB ============================== */
function DepartmentsTab() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', description: '', color: '#6366f1' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => { api.getDepartments().then(setDepartments).finally(() => setLoading(false)); }, []);
  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editId) {
        await api.updateDepartment(editId, form);
      } else {
        await api.createDepartment(form);
      }
      setEditId(null); setShowCreate(false); setForm({ name: '', slug: '', description: '', color: '#6366f1' });
      load();
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deactivate department "${name}"? Users will need to be reassigned.`)) return;
    await api.deleteDepartment(id);
    load();
  };

  const startEdit = (d: any) => {
    setEditId(d.id);
    setForm({ name: d.name, slug: d.slug, description: d.description || '', color: d.color || '#6366f1' });
    setShowCreate(true);
  };

  if (loading) return <Loader2 className="animate-spin text-primary mx-auto" size={24} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Departments</h2>
        <button onClick={() => { setShowCreate(true); setEditId(null); setForm({ name: '', slug: '', description: '', color: '#6366f1' }); }}
          className="flex items-center gap-2 h-9 px-4 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90">
          <Plus size={14} /> Add Department
        </button>
      </div>

      {showCreate && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold">{editId ? 'Edit Department' : 'New Department'}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Name</label>
              <input className="w-full h-9 px-3 rounded-lg bg-secondary border border-border text-sm" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Slug</label>
              <input className="w-full h-9 px-3 rounded-lg bg-secondary border border-border text-sm" value={form.slug}
                onChange={e => setForm({ ...form, slug: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Description</label>
              <input className="w-full h-9 px-3 rounded-lg bg-secondary border border-border text-sm" value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Color</label>
              <div className="flex items-center gap-2">
                <input type="color" className="w-9 h-9 rounded-lg cursor-pointer" value={form.color}
                  onChange={e => setForm({ ...form, color: e.target.value })} />
                <input className="flex-1 h-9 px-3 rounded-lg bg-secondary border border-border text-sm" value={form.color}
                  onChange={e => setForm({ ...form, color: e.target.value })} />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 h-9 px-5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
              {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} {editId ? 'Update' : 'Create'}
            </button>
            <button onClick={() => { setShowCreate(false); setEditId(null); }} className="h-9 px-4 rounded-lg text-sm hover:bg-accent">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {departments.map(d => (
          <div key={d.id} className="flex items-center gap-4 bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: d.color + '20' }}>
              <Building2 size={18} style={{ color: d.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{d.name}</span>
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">{d.slug}</span>
              </div>
              {d.description && <p className="text-xs text-muted-foreground mt-0.5">{d.description}</p>}
              <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                <span><Users size={12} className="inline mr-1" />{d._count?.users || 0} users</span>
                <span><Ticket size={12} className="inline mr-1" />{d._count?.toTickets || 0} tickets</span>
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => startEdit(d)} className="p-2 rounded-lg hover:bg-accent text-muted-foreground"><Edit2 size={14} /></button>
              <button onClick={() => handleDelete(d.id, d.name)} className="p-2 rounded-lg hover:bg-red-500/10 text-red-400"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================== PERMISSIONS TAB ============================== */
function PermissionsTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [userPerms, setUserPerms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api.getUsers({ limit: '200' }),
      api.getPermissions(),
    ]).then(([u, p]) => {
      setUsers(u.data || u);
      setPermissions(p);
    }).finally(() => setLoading(false));
  }, []);

  const selectUser = async (userId: string) => {
    setSelectedUser(userId);
    const perms = await api.getUserPermissions(userId);
    setUserPerms(perms.map((p: any) => p.permissionName));
  };

  const togglePerm = (permName: string) => {
    setUserPerms(prev => prev.includes(permName) ? prev.filter(p => p !== permName) : [...prev, permName]);
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      await api.setUserPermissions(selectedUser, userPerms);
    } finally { setSaving(false); }
  };

  if (loading) return <Loader2 className="animate-spin text-primary mx-auto" size={24} />;

  const grouped = permissions.reduce((acc: Record<string, any[]>, p: any) => {
    (acc[p.category] = acc[p.category] || []).push(p);
    return acc;
  }, {});

  const selectedUserData = users.find((u: any) => u.id === selectedUser);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* User list */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <h3 className="text-sm font-semibold mb-3">Select User</h3>
        <div className="space-y-1 max-h-[500px] overflow-y-auto">
          {users.filter((u: any) => u.globalRole !== 'GLOBAL_ADMIN').map((u: any) => (
            <button key={u.id} onClick={() => selectUser(u.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${selectedUser === u.id ? 'bg-primary/10 border border-primary/30' : 'hover:bg-accent'
                }`}>
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
                {u.firstName?.[0]}{u.lastName?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{u.firstName} {u.lastName}</p>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
              </div>
              <ChevronRight size={14} className="text-muted-foreground" />
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3 italic">Global Admins have all permissions automatically.</p>
      </div>

      {/* Permissions */}
      <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5">
        {!selectedUser ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Select a user to manage permissions</div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Permissions for {selectedUserData?.firstName} {selectedUserData?.lastName}</h3>
                <p className="text-xs text-muted-foreground">{selectedUserData?.email}</p>
              </div>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 h-9 px-5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
                {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Save
              </button>
            </div>

            {Object.entries(grouped).map(([category, perms]) => (
              <div key={category}>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{category}</h4>
                <div className="space-y-1">
                  {(perms as any[]).map((p: any) => (
                    <button key={p.name} onClick={() => togglePerm(p.name)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${userPerms.includes(p.name) ? 'bg-primary/10 border border-primary/30' : 'bg-secondary/50 hover:bg-accent border border-transparent'
                        }`}>
                      <div className={`w-5 h-5 rounded flex items-center justify-center ${userPerms.includes(p.name) ? 'bg-primary text-primary-foreground' : 'bg-secondary border border-border'
                        }`}>
                        {userPerms.includes(p.name) && <Check size={12} />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{p.label}</p>
                        {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================== STATUSES TAB ============================== */
function StatusesTab() {
  const [statuses, setStatuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', label: '', color: '#6366f1', isClosedState: false });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => { api.getCustomStatuses().then(setStatuses).finally(() => setLoading(false)); }, []);
  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editId) {
        await api.updateCustomStatus(editId, { label: form.label, color: form.color, isClosedState: form.isClosedState });
      } else {
        await api.createCustomStatus(form);
      }
      setEditId(null); setShowForm(false); setForm({ name: '', label: '', color: '#6366f1', isClosedState: false });
      load();
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deactivate status "${name}"? Existing tickets will keep their status.`)) return;
    await api.deleteCustomStatus(id);
    load();
  };

  const startEdit = (s: any) => {
    setEditId(s.id); setForm({ name: s.name, label: s.label, color: s.color, isClosedState: s.isClosedState }); setShowForm(true);
  };

  if (loading) return <Loader2 className="animate-spin text-primary mx-auto" size={24} />;

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Ticket Statuses</h2>
          <p className="text-xs text-muted-foreground">Manage available ticket statuses</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm({ name: '', label: '', color: '#6366f1', isClosedState: false }); }}
          className="flex items-center gap-2 h-9 px-4 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90">
          <Plus size={14} /> Add Status
        </button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold">{editId ? 'Edit Status' : 'New Status'}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Name (key)</label>
              <input disabled={!!editId} className="w-full h-9 px-3 rounded-lg bg-secondary border border-border text-sm disabled:opacity-50"
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value.toUpperCase().replace(/\s+/g, '_') })} placeholder="IN_REVIEW" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Label</label>
              <input className="w-full h-9 px-3 rounded-lg bg-secondary border border-border text-sm"
                value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="In Review" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Color</label>
              <div className="flex items-center gap-2">
                <input type="color" className="w-9 h-9 rounded cursor-pointer" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} />
                <input className="flex-1 h-9 px-3 rounded-lg bg-secondary border border-border text-sm" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setForm({ ...form, isClosedState: !form.isClosedState })}
                className={`relative w-10 h-5 rounded-full transition-colors ${form.isClosedState ? 'bg-primary' : 'bg-zinc-600'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.isClosedState ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
              </button>
              <span className="text-sm">Closed state</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 h-9 px-5 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50">
              {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} {editId ? 'Update' : 'Create'}
            </button>
            <button onClick={() => { setShowForm(false); setEditId(null); }} className="h-9 px-4 rounded-lg text-sm hover:bg-accent">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {statuses.map(s => (
          <div key={s.id} className={`flex items-center gap-4 bg-card border rounded-xl p-4 transition-all ${s.isActive ? 'border-border' : 'border-border/50 opacity-50'}`}>
            <div className="w-4 h-4 rounded" style={{ backgroundColor: s.color }} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{s.label}</span>
                <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded">{s.name}</span>
                {s.isClosedState && <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded">Closed state</span>}
                {!s.isActive && <span className="text-[10px] text-zinc-400 bg-zinc-500/10 px-2 py-0.5 rounded">Inactive</span>}
              </div>
            </div>
            <span className="text-xs text-muted-foreground">Order: {s.sortOrder}</span>
            <div className="flex gap-1">
              <button onClick={() => startEdit(s)} className="p-2 rounded-lg hover:bg-accent text-muted-foreground"><Edit2 size={14} /></button>
              {s.isActive && <button onClick={() => handleDelete(s.id, s.name)} className="p-2 rounded-lg hover:bg-red-500/10 text-red-400"><Trash2 size={14} /></button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================== PRIORITIES TAB ============================== */
function PrioritiesTab() {
  const [priorities, setPriorities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', label: '', color: '#6366f1', slaResponseHours: 24, slaResolutionHours: 72 });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => { api.getCustomPriorities().then(setPriorities).finally(() => setLoading(false)); }, []);
  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editId) {
        await api.updateCustomPriority(editId, {
          label: form.label, color: form.color,
          slaResponseHours: Number(form.slaResponseHours), slaResolutionHours: Number(form.slaResolutionHours),
        });
      } else {
        await api.createCustomPriority({
          ...form, slaResponseHours: Number(form.slaResponseHours), slaResolutionHours: Number(form.slaResolutionHours),
        });
      }
      setEditId(null); setShowForm(false);
      setForm({ name: '', label: '', color: '#6366f1', slaResponseHours: 24, slaResolutionHours: 72 });
      load();
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deactivate priority "${name}"?`)) return;
    await api.deleteCustomPriority(id);
    load();
  };

  const startEdit = (p: any) => {
    setEditId(p.id);
    setForm({ name: p.name, label: p.label, color: p.color, slaResponseHours: p.slaResponseHours, slaResolutionHours: p.slaResolutionHours });
    setShowForm(true);
  };

  if (loading) return <Loader2 className="animate-spin text-primary mx-auto" size={24} />;

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Ticket Priorities & SLA</h2>
          <p className="text-xs text-muted-foreground">Set response and resolution SLA hours per priority level</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm({ name: '', label: '', color: '#6366f1', slaResponseHours: 24, slaResolutionHours: 72 }); }}
          className="flex items-center gap-2 h-9 px-4 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90">
          <Plus size={14} /> Add Priority
        </button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold">{editId ? 'Edit Priority' : 'New Priority'}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Name (key)</label>
              <input disabled={!!editId} className="w-full h-9 px-3 rounded-lg bg-secondary border border-border text-sm disabled:opacity-50"
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value.toUpperCase().replace(/\s+/g, '_') })} placeholder="CRITICAL" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Label</label>
              <input className="w-full h-9 px-3 rounded-lg bg-secondary border border-border text-sm"
                value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="Critical" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Color</label>
              <div className="flex items-center gap-2">
                <input type="color" className="w-9 h-9 rounded cursor-pointer" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} />
                <input className="flex-1 h-9 px-3 rounded-lg bg-secondary border border-border text-sm" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 p-4 bg-secondary/30 rounded-xl border border-border/50">
            <div>
              <label className="block text-xs font-medium mb-1 flex items-center gap-1"><Clock size={12} /> SLA Response Hours</label>
              <input type="number" className="w-full h-9 px-3 rounded-lg bg-secondary border border-border text-sm"
                value={form.slaResponseHours} onChange={e => setForm({ ...form, slaResponseHours: parseInt(e.target.value) || 0 })} />
              <p className="text-[10px] text-muted-foreground mt-1">Time to first response</p>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 flex items-center gap-1"><AlertTriangle size={12} /> SLA Resolution Hours</label>
              <input type="number" className="w-full h-9 px-3 rounded-lg bg-secondary border border-border text-sm"
                value={form.slaResolutionHours} onChange={e => setForm({ ...form, slaResolutionHours: parseInt(e.target.value) || 0 })} />
              <p className="text-[10px] text-muted-foreground mt-1">Time to resolve ticket</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 h-9 px-5 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50">
              {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} {editId ? 'Update' : 'Create'}
            </button>
            <button onClick={() => { setShowForm(false); setEditId(null); }} className="h-9 px-4 rounded-lg text-sm hover:bg-accent">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {priorities.map(p => (
          <div key={p.id} className={`flex items-center gap-4 bg-card border rounded-xl p-4 transition-all ${p.isActive ? 'border-border' : 'border-border/50 opacity-50'}`}>
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: p.color }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{p.label}</span>
                <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded">{p.name}</span>
                {!p.isActive && <span className="text-[10px] text-zinc-400 bg-zinc-500/10 px-2 py-0.5 rounded">Inactive</span>}
              </div>
            </div>
            <div className="flex gap-4 text-xs text-muted-foreground shrink-0">
              <span className="flex items-center gap-1"><Clock size={12} /> Response: <strong className="text-foreground">{p.slaResponseHours}h</strong></span>
              <span className="flex items-center gap-1"><AlertTriangle size={12} /> Resolution: <strong className="text-foreground">{p.slaResolutionHours}h</strong></span>
            </div>
            <div className="flex gap-1">
              <button onClick={() => startEdit(p)} className="p-2 rounded-lg hover:bg-accent text-muted-foreground"><Edit2 size={14} /></button>
              {p.isActive && <button onClick={() => handleDelete(p.id, p.name)} className="p-2 rounded-lg hover:bg-red-500/10 text-red-400"><Trash2 size={14} /></button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
