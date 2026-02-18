'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Plus, Loader2, Edit2, Trash2 } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', globalRole: 'USER', departmentId: '', departmentRole: 'DEPARTMENT_USER' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    const [u, d] = await Promise.all([api.getUsers(), api.getDepartments()]);
    setUsers(u.data); setDepartments(d); setLoading(false);
  };
  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setEditUser(null);
    setForm({ email: '', password: '', firstName: '', lastName: '', globalRole: 'USER', departmentId: '', departmentRole: 'DEPARTMENT_USER' });
    setShowModal(true); setError('');
  };

  const openEdit = (u: any) => {
    setEditUser(u);
    setForm({ email: u.email, password: '', firstName: u.firstName, lastName: u.lastName, globalRole: u.globalRole, departmentId: u.departmentId || '', departmentRole: u.departmentRole });
    setShowModal(true); setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const payload: any = { ...form };
      if (!payload.password) delete payload.password;
      if (editUser) await api.updateUser(editUser.id, payload);
      else await api.createUser(payload);
      setShowModal(false); fetchData();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deactivate this user?')) { await api.deleteUser(id); fetchData(); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
        <button onClick={openCreate} className="flex items-center gap-2 h-10 px-5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90">
          <Plus size={16} /> Add User
        </button>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32"><Loader2 className="animate-spin text-primary" size={20} /></div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="p-3 pl-5 font-medium text-muted-foreground">Name</th>
                <th className="p-3 font-medium text-muted-foreground">Email</th>
                <th className="p-3 font-medium text-muted-foreground">Department</th>
                <th className="p-3 font-medium text-muted-foreground">Role</th>
                <th className="p-3 font-medium text-muted-foreground">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-accent/50">
                  <td className="p-3 pl-5 font-medium">{u.firstName} {u.lastName}</td>
                  <td className="p-3 text-muted-foreground">{u.email}</td>
                  <td className="p-3">
                    {u.department ? (
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: u.department.color }} />
                        {u.department.name}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="p-3">
                    <span className="text-xs px-2 py-0.5 bg-secondary rounded-md">
                      {u.globalRole === 'GLOBAL_ADMIN' ? 'Admin' : u.departmentRole === 'DEPARTMENT_HEAD' ? 'Dept Head' : 'User'}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`text-xs ${u.isActive ? 'text-emerald-400' : 'text-red-400'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-3 text-right space-x-1">
                    <button onClick={() => openEdit(u)} className="p-1.5 hover:bg-accent rounded"><Edit2 size={14} /></button>
                    <button onClick={() => handleDelete(u.id)} className="p-1.5 hover:bg-accent rounded text-destructive"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowModal(false)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-md m-4 p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">{editUser ? 'Edit User' : 'Create User'}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">First name *</label>
                  <input className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Last name *</label>
                  <input className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Email *</label>
                <input type="email" className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Password {editUser ? '(leave blank to keep)' : '*'}</label>
                <input type="password" className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm" value={form.password} onChange={e => setForm({...form, password: e.target.value})} {...(!editUser ? {required: true} : {})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Department</label>
                  <select className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm" value={form.departmentId} onChange={e => setForm({...form, departmentId: e.target.value})}>
                    <option value="">None</option>
                    {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Dept Role</label>
                  <select className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm" value={form.departmentRole} onChange={e => setForm({...form, departmentRole: e.target.value})}>
                    <option value="DEPARTMENT_USER">User</option>
                    <option value="DEPARTMENT_HEAD">Head</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Global Role</label>
                <select className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm" value={form.globalRole} onChange={e => setForm({...form, globalRole: e.target.value})}>
                  <option value="USER">User</option>
                  <option value="GLOBAL_ADMIN">Global Admin</option>
                </select>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 h-10 rounded-xl text-sm hover:bg-accent">Cancel</button>
                <button type="submit" disabled={saving} className="px-6 h-10 bg-primary text-primary-foreground rounded-xl text-sm font-medium disabled:opacity-50">
                  {saving ? 'Saving...' : editUser ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
