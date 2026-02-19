'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useNotificationStore } from '@/stores/notifications';
import { Plus, Loader2, ChevronLeft, ChevronRight, Clock, AlertTriangle, Bell, X, User, Building2, PenSquare } from 'lucide-react';
import RichTextEditor from '@/components/common/RichTextEditor';
import FileAttachment, { type UploadedFile } from '@/components/common/FileAttachment';
import EntityTypeSelector from '@/components/common/EntityTypeSelector';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
  OPEN: 'bg-blue-500/10 text-blue-500 border-blue-500/20', IN_PROGRESS: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  WAITING_REPLY: 'bg-purple-500/10 text-purple-500 border-purple-500/20', APPROVED: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  REJECTED: 'bg-red-500/10 text-red-500 border-red-500/20', CLOSED: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
};
const priorityDots: Record<string, string> = { LOW: 'bg-zinc-400', NORMAL: 'bg-blue-400', HIGH: 'bg-amber-400', URGENT: 'bg-red-400' };

/* ============================== CREATE MODAL ============================== */
function CreateTicketModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { user } = useAuthStore();
  const [departments, setDepartments] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [form, setForm] = useState({
    title: '', description: '', toDepartmentId: '', subtypeId: '',
    assignedToId: '', priority: 'NORMAL', dueDate: '', formData: {} as any,
    entityType: '' as string, entityId: '' as string, entityName: '' as string,
  });
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const [ccUserIds, setCcUserIds] = useState<string[]>([]);
  const [selectedSubtype, setSelectedSubtype] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      api.getDepartments().then(setDepartments);
      api.getUsers().then((r) => setUsers(r.data));
      setForm({ title: '', description: '', toDepartmentId: '', subtypeId: '', assignedToId: '', priority: 'NORMAL', dueDate: '', formData: {}, entityType: '', entityId: '', entityName: '' });
      setAttachments([]);
      setCcUserIds([]);
      setSelectedSubtype(null);
      setError('');
    }
  }, [open]);

  useEffect(() => {
    if (form.toDepartmentId) {
      api.getFormHierarchy(form.toDepartmentId).then(setCategories).catch(() => setCategories([]));
    } else { setCategories([]); }
  }, [form.toDepartmentId]);

  useEffect(() => {
    if (form.subtypeId) {
      api.getSubtype(form.subtypeId).then(setSelectedSubtype).catch(() => setSelectedSubtype(null));
    } else { setSelectedSubtype(null); }
  }, [form.subtypeId]);

  const doSubmit = async (isDraft: boolean) => {
    setLoading(true); setError('');
    try {
      const submitFormData = { ...form.formData };
      if (form.entityType && form.entityType !== 'none') {
        submitFormData._entityType = form.entityType;
        submitFormData._entityId = form.entityId;
        submitFormData._entityName = form.entityName;
      }
      await api.createTicket({
        title: form.title || (isDraft ? 'Untitled Draft' : ''),
        description: form.description,
        toDepartmentId: form.toDepartmentId,
        subtypeId: form.subtypeId,
        assignedToId: form.assignedToId,
        priority: form.priority,
        dueDate: form.dueDate,
        formData: submitFormData,
        attachmentIds: attachments.map(a => a.id),
        watcherIds: ccUserIds,
        isDraft,
      });
      onCreated(); onClose();
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await doSubmit(false);
  };

  const renderFieldInput = (field: any) => {
    const value = form.formData[field.id] ?? '';
    const onChange = (v: any) => setForm({ ...form, formData: { ...form.formData, [field.id]: v } });

    switch (field.type) {
      case 'TEXT': return <input className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm" value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} />;
      case 'TEXTAREA': return <textarea className="w-full h-24 px-3 py-2 rounded-lg bg-secondary border border-border text-sm resize-none" value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} />;
      case 'RICH_TEXT': return <RichTextEditor value={value} onChange={onChange} minHeight="100px" />;
      case 'NUMBER': return <input type="number" className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm" value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} />;
      case 'DATE': return <input type="date" className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm" value={value} onChange={(e) => onChange(e.target.value)} />;
      case 'DATETIME': return <input type="datetime-local" className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm" value={value} onChange={(e) => onChange(e.target.value)} />;
      case 'SELECT': case 'DEPARTMENT_SELECTOR': case 'USER_SELECTOR': return (
        <select className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select...</option>
          {field.options?.map((o: string) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
      case 'MULTI_SELECT': return (
        <div className="flex flex-wrap gap-2">
          {field.options?.map((o: string) => (
            <label key={o} className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="checkbox" checked={(value || []).includes(o)} onChange={(e) => {
                const arr = value || [];
                onChange(e.target.checked ? [...arr, o] : arr.filter((x: string) => x !== o));
              }} className="rounded" /> {o}
            </label>
          ))}
        </div>
      );
      case 'RADIO_GROUP': return (
        <div className="flex flex-wrap gap-3">
          {field.options?.map((o: string) => (
            <label key={o} className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="radio" name={field.id} checked={value === o} onChange={() => onChange(o)} /> {o}
            </label>
          ))}
        </div>
      );
      case 'CHECKBOX': return (
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="rounded" /> {field.label}
        </label>
      );
      case 'FILE_UPLOAD': case 'IMAGE_UPLOAD': return (
        <FileAttachment
          files={(form.formData[`${field.id}_files`] || []) as UploadedFile[]}
          onChange={(f) => setForm({ ...form, formData: { ...form.formData, [`${field.id}_files`]: f, [field.id]: f.map(x => x.id) } })}
          accept={field.type === 'IMAGE_UPLOAD' ? 'image/*' : undefined}
          compact
        />
      );
      case 'ENTITY_TYPE': return (
        <EntityTypeSelector
          value={form.formData[field.id] || {}}
          onChange={(v: any) => setForm({ ...form, formData: { ...form.formData, [field.id]: v } })}
        />
      );
      default: return <input className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm" value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} />;
    }
  };

  // Render a field with its label, respecting colSpan and GROUP nesting
  const renderDynamicField = (field: any): React.ReactNode => {
    // Conditional visibility
    if (field.condition) {
      const depValue = form.formData[field.condition.field];
      if (depValue !== field.condition.value) return null;
    }

    // GROUP type: render as a section with nested grid
    if (field.type === 'GROUP') {
      const visibleChildren = (field.children || []).filter((child: any) => {
        if (!child.condition) return true;
        return form.formData[child.condition.field] === child.condition.value;
      });
      if (visibleChildren.length === 0 && !field.label) return null;
      return (
        <div
          key={field.id}
          className="border border-border rounded-xl p-4 bg-accent/20"
          style={{ gridColumn: `span ${Math.min(field.colSpan || 12, 12)}` }}
        >
          {field.label && <h4 className="text-sm font-semibold mb-1">{field.label}</h4>}
          {field.description && <p className="text-xs text-muted-foreground mb-3">{field.description}</p>}
          <div className="grid grid-cols-12 gap-4">
            {(field.children || []).map((child: any) => renderDynamicField(child))}
          </div>
        </div>
      );
    }

    // REPEATER type: render as an editable table with add/remove rows
    if (field.type === 'REPEATER') {
      const cols = field.columns || [];
      const rows: any[] = form.formData[field.id] || [];
      const minRows = field.minRows || 1;
      const maxRows = field.maxRows || 50;

      // Ensure minimum rows exist
      if (rows.length < minRows) {
        const emptyRow: any = {};
        cols.forEach((c: any) => { emptyRow[c.id] = ''; });
        const padded = [...rows];
        while (padded.length < minRows) padded.push({ ...emptyRow });
        // Immediately set
        if (rows.length === 0) {
          setTimeout(() => {
            setForm((prev: any) => ({ ...prev, formData: { ...prev.formData, [field.id]: padded } }));
          }, 0);
        }
      }

      const addRow = () => {
        if (rows.length >= maxRows) return;
        const emptyRow: any = {};
        cols.forEach((c: any) => { emptyRow[c.id] = ''; });
        setForm({ ...form, formData: { ...form.formData, [field.id]: [...rows, emptyRow] } });
      };

      const removeRow = (idx: number) => {
        if (rows.length <= minRows) return;
        setForm({ ...form, formData: { ...form.formData, [field.id]: rows.filter((_: any, i: number) => i !== idx) } });
      };

      const updateCell = (rowIdx: number, colId: string, value: any) => {
        const updated = [...rows];
        updated[rowIdx] = { ...updated[rowIdx], [colId]: value };
        setForm({ ...form, formData: { ...form.formData, [field.id]: updated } });
      };

      const renderCellInput = (col: any, rowIdx: number) => {
        const val = rows[rowIdx]?.[col.id] ?? '';
        switch (col.type) {
          case 'NUMBER': return <input type="number" className="w-full h-9 px-2 rounded-lg bg-secondary border border-border text-sm" value={val} onChange={e => updateCell(rowIdx, col.id, e.target.value)} placeholder={col.placeholder} />;
          case 'SELECT': return (
            <select className="w-full h-9 px-2 rounded-lg bg-secondary border border-border text-sm" value={val} onChange={e => updateCell(rowIdx, col.id, e.target.value)}>
              <option value="">Select...</option>
              {(col.options || []).map((o: string) => <option key={o} value={o}>{o}</option>)}
            </select>
          );
          case 'DATE': return <input type="date" className="w-full h-9 px-2 rounded-lg bg-secondary border border-border text-sm" value={val} onChange={e => updateCell(rowIdx, col.id, e.target.value)} />;
          case 'CHECKBOX': return <input type="checkbox" checked={!!val} onChange={e => updateCell(rowIdx, col.id, e.target.checked)} className="rounded" />;
          case 'TEXTAREA': return <textarea className="w-full h-16 px-2 py-1 rounded-lg bg-secondary border border-border text-sm resize-none" value={val} onChange={e => updateCell(rowIdx, col.id, e.target.value)} placeholder={col.placeholder} />;
          default: return <input className="w-full h-9 px-2 rounded-lg bg-secondary border border-border text-sm" value={val} onChange={e => updateCell(rowIdx, col.id, e.target.value)} placeholder={col.placeholder} />;
        }
      };

      return (
        <div key={field.id} style={{ gridColumn: `span ${Math.min(field.colSpan || 12, 12)}` }}>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </label>
            <button type="button" onClick={addRow} disabled={rows.length >= maxRows}
              className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-40 disabled:no-underline">
              <Plus size={12} /> Add row
            </button>
          </div>
          <div className="border border-border rounded-xl overflow-hidden">
            {/* Header */}
            <div className="grid bg-accent/50" style={{ gridTemplateColumns: `repeat(${cols.length}, 1fr) 56px` }}>
              {cols.map((col: any) => (
                <div key={col.id} className="px-3 py-2 text-xs font-semibold border-r border-border last:border-r-0">
                  {col.label}{col.required ? ' *' : ''}
                </div>
              ))}
              <div className="px-2 py-2 text-xs text-muted-foreground" />
            </div>
            {/* Rows */}
            {(rows.length > 0 ? rows : [{}]).map((row: any, rowIdx: number) => (
              <div key={rowIdx} className="grid border-t border-border" style={{ gridTemplateColumns: `repeat(${cols.length}, 1fr) 56px` }}>
                {cols.map((col: any) => (
                  <div key={col.id} className="px-2 py-1.5 border-r border-border last:border-r-0">
                    {renderCellInput(col, rowIdx)}
                  </div>
                ))}
                <div className="px-2 py-1.5 flex items-center justify-center">
                  <button type="button" onClick={() => removeRow(rowIdx)} disabled={rows.length <= minRows}
                    className="text-xs text-destructive hover:underline disabled:opacity-30 disabled:no-underline">
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {rows.length} row{rows.length !== 1 ? 's' : ''} · {minRows} min, {maxRows} max
          </p>
        </div>
      );
    }

    // Regular field: render label + input respecting colSpan
    const input = renderFieldInput(field);
    if (!input) return null;

    return (
      <div
        key={field.id}
        style={{ gridColumn: `span ${Math.min(field.colSpan || 12, 12)}` }}
      >
        {field.type !== 'CHECKBOX' && (
          <label className="block text-sm font-medium mb-1.5">
            {field.label} {field.required && <span className="text-destructive">*</span>}
          </label>
        )}
        {input}
      </div>
    );
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm pt-[5vh]" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-border sticky top-0 bg-card z-10 rounded-t-2xl">
          <h2 className="text-lg font-bold">New Request</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Create a new inter-department request</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Department + Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">To Department <span className="text-destructive">*</span></label>
              <select className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm" value={form.toDepartmentId} onChange={(e) => setForm({ ...form, toDepartmentId: e.target.value, subtypeId: '' })} required>
                <option value="">Select department</option>
                {departments.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Request Type</label>
              <select className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm" value={form.subtypeId} onChange={(e) => setForm({ ...form, subtypeId: e.target.value })}>
                <option value="">General request</option>
                {categories.map((cat: any) => (
                  <optgroup key={cat.id} label={cat.name}>
                    {cat.subtypes?.map((st: any) => <option key={st.id} value={st.id}>{st.name}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Title <span className="text-destructive">*</span></label>
            <input className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Brief summary of your request" required />
          </div>

          {/* Description — Rich Text Editor */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Description <span className="text-destructive">*</span></label>
            <RichTextEditor
              value={form.description}
              onChange={(val) => setForm({ ...form, description: val })}
              placeholder="Describe your request in detail... You can paste images directly here."
              minHeight="180px"
              onFilesChange={setAttachments}
            />
          </div>

          {/* Client / Supplier selector */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Related Entity</label>
            <EntityTypeSelector
              value={{ type: (form.entityType as any) || '', id: form.entityId, name: form.entityName }}
              onChange={(v) => setForm({ ...form, entityType: v.type || '', entityId: v.id || '', entityName: v.name || '' })}
            />
          </div>

          {/* Dynamic form fields from subtype schema — rendered as a 12-col grid */}
          {selectedSubtype?.formSchema?.schema?.fields?.length > 0 && (
            <div className="grid grid-cols-12 gap-4">
              {selectedSubtype.formSchema.schema.fields.map((field: any) => renderDynamicField(field))}
            </div>
          )}

          {/* Attachments zone (separate from inline) */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Additional Attachments</label>
            <FileAttachment files={attachments} onChange={setAttachments} compact />
          </div>

          {/* Priority / Assign / Due */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Priority</label>
              <select className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                {['LOW', 'NORMAL', 'HIGH', 'URGENT'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Assign to</label>
              <select className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm" value={form.assignedToId} onChange={(e) => setForm({ ...form, assignedToId: e.target.value })}>
                <option value="">Unassigned</option>
                {users.filter((u: any) => u.departmentId === form.toDepartmentId).map((u: any) => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Due date</label>
              <input type="date" className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
          </div>

          {/* CC / Watchers */}
          <div>
            <label className="block text-sm font-medium mb-1.5">CC / Watchers</label>
            <div className="border border-border rounded-lg bg-secondary p-2 min-h-[42px]">
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {ccUserIds.map((uid) => {
                  const u = users.find((x: any) => x.id === uid);
                  if (!u) return null;
                  return (
                    <span key={uid} className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-xs font-medium">
                      {u.firstName} {u.lastName}
                      <button type="button" onClick={() => setCcUserIds(ccUserIds.filter(x => x !== uid))} className="hover:text-destructive">
                        <X size={10} />
                      </button>
                    </span>
                  );
                })}
              </div>
              <select
                className="w-full h-8 px-2 rounded bg-transparent border-0 text-xs focus:outline-none"
                value=""
                onChange={(e) => {
                  if (e.target.value && !ccUserIds.includes(e.target.value)) {
                    setCcUserIds([...ccUserIds, e.target.value]);
                  }
                  e.target.value = '';
                }}
              >
                <option value="">Add a watcher...</option>
                {users.filter((u: any) => !ccUserIds.includes(u.id)).map((u: any) => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.department?.name || 'No dept'})</option>
                ))}
              </select>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Watchers will receive notifications for all updates on this ticket</p>
          </div>

          {error && <p className="text-sm text-destructive bg-destructive/10 px-4 py-2.5 rounded-xl">{error}</p>}

          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <button type="button" onClick={onClose} className="px-4 h-10 rounded-xl text-sm font-medium hover:bg-accent transition-colors">Cancel</button>
            <button type="button" disabled={loading} onClick={() => doSubmit(true)}
              className="px-5 h-10 bg-secondary text-foreground border border-border rounded-xl text-sm font-medium hover:bg-accent disabled:opacity-50 flex items-center gap-2 transition-all">
              {loading && <Loader2 className="animate-spin" size={14} />}
              Save as Draft
            </button>
            <button type="submit" disabled={loading} className="px-6 h-10 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2 transition-all">
              {loading && <Loader2 className="animate-spin" size={14} />}
              Create Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ============================== TICKETS LIST ============================== */
export default function TicketsPage() {
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const { fetchUnreadTicketIds, unreadTicketIds } = useNotificationStore();
  const [tickets, setTickets] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: '', priority: '', search: '' });
  const [showCreate, setShowCreate] = useState(searchParams.get('new') === 'true');
  const isDeptHead = user?.departmentRole === 'DEPARTMENT_HEAD' || user?.globalRole === 'GLOBAL_ADMIN';
  const [view, setView] = useState<'personal' | 'department' | 'drafts'>('personal');
  const [showToggle, setShowToggle] = useState(false);

  // Update toggle visibility when user loads
  useEffect(() => {
    if (user) {
      setShowToggle(user.departmentRole === 'DEPARTMENT_HEAD' || user.globalRole === 'GLOBAL_ADMIN');
    }
  }, [user]);

  // Ensure unread ticket IDs are loaded
  useEffect(() => { fetchUnreadTicketIds(); }, [fetchUnreadTicketIds]);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page: String(page), limit: '25' };
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.search) params.search = filters.search;
      params.view = view;
      if (view === 'drafts') params.status = 'DRAFT';
      const data = await api.getTickets(params);
      setTickets(data.data); setTotal(data.total);
    } finally { setLoading(false); }
  }, [page, filters, view]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  // Reset page when switching views
  const switchView = (v: 'personal' | 'department' | 'drafts') => {
    setView(v);
    setPage(1);
  };

  const getSlaStatus = (ticket: any) => {
    if (['CLOSED', 'REJECTED'].includes(ticket.status)) return null;
    const deadline = ticket.slaResolutionDeadline ? new Date(ticket.slaResolutionDeadline) : null;
    if (!deadline) return null;
    const hoursLeft = (deadline.getTime() - Date.now()) / 3600000;
    if (hoursLeft < 0) return 'red';
    if (hoursLeft < 8) return 'yellow';
    return 'green';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tickets</h1>
          <p className="text-sm text-muted-foreground">{total} total</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 h-10 px-5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90">
          <Plus size={16} /> New Request
        </button>
      </div>

      {/* View tabs — always show My Tickets + Drafts; dept heads also get Department */}
      <div className="flex gap-1 bg-secondary rounded-xl p-1 w-fit">
        <button
          onClick={() => switchView('personal')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            view === 'personal' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <User size={15} /> My Tickets
        </button>
        {showToggle && (
          <button
            onClick={() => switchView('department')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              view === 'department' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Building2 size={15} /> Department
          </button>
        )}
        <button
          onClick={() => switchView('drafts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            view === 'drafts' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <PenSquare size={15} /> Drafts
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <input placeholder="Search tickets..." value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="flex-1 max-w-sm h-10 px-4 rounded-xl bg-card border border-border text-sm" />
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="h-10 px-3 rounded-xl bg-card border border-border text-sm">
          <option value="">All Status</option>
          {['DRAFT', 'OPEN', 'IN_PROGRESS', 'WAITING_REPLY', 'APPROVED', 'REJECTED', 'CLOSED'].map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <select value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })} className="h-10 px-3 rounded-xl bg-card border border-border text-sm">
          <option value="">All Priority</option>
          {['LOW', 'NORMAL', 'HIGH', 'URGENT'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Ticket list */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32"><Loader2 className="animate-spin text-primary" size={20} /></div>
        ) : tickets.length === 0 ? (
          <p className="p-8 text-center text-muted-foreground text-sm">No tickets found</p>
        ) : (
          <div className="divide-y divide-border">
            {tickets.map((ticket) => {
              const sla = getSlaStatus(ticket);
              const hasUnread = unreadTicketIds.includes(ticket.id);
              return (
                <Link key={ticket.id} href={`/dashboard/tickets/${ticket.id}`}
                  className={`flex items-center gap-3 p-4 hover:bg-accent/50 transition-all group relative
                    ${hasUnread ? 'bg-primary/[0.06] border-l-[3px] border-l-primary' : 'border-l-[3px] border-l-transparent'}`}
                >
                  {/* Unread pulsing dot */}
                  {hasUnread ? (
                    <div className="relative shrink-0">
                      <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                      <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-primary animate-ping opacity-40" />
                    </div>
                  ) : (
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${priorityDots[ticket.priority]}`} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {hasUnread && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-primary/15 text-primary rounded text-[10px] font-semibold">
                          <Bell size={10} className="fill-primary" /> NEW
                        </span>
                      )}
                      <span className="font-mono text-xs text-muted-foreground">{ticket.ticketNumber}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${statusColors[ticket.status]}`}>{ticket.status.replace('_', ' ')}</span>
                      {sla === 'red' && <AlertTriangle size={12} className="text-red-400 animate-pulse" />}
                      {sla === 'yellow' && <Clock size={12} className="text-amber-400" />}
                      {ticket.subtype && <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{ticket.subtype.category?.name} / {ticket.subtype.name}</span>}
                      {ticket.metadata?.entityType && ticket.metadata.entityType !== 'none' && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${ticket.metadata.entityType === 'client' ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                          {ticket.metadata.entityType === 'client' ? '👤' : '🚚'} {ticket.metadata.entityName || ticket.metadata.entityType}
                        </span>
                      )}
                    </div>
                    <p className={`text-sm truncate group-hover:text-primary transition-colors ${hasUnread ? 'font-semibold text-foreground' : 'font-medium'}`}>{ticket.title}</p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ticket.fromDepartment?.color }} />
                      {ticket.fromDepartment?.name}
                      <span className="mx-1">→</span>
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ticket.toDepartment?.color }} />
                      {ticket.toDepartment?.name}
                    </div>
                    {ticket.assignedTo && <span>{ticket.assignedTo.firstName} {ticket.assignedTo.lastName?.[0]}.</span>}
                    <span className="text-[10px]">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
        {total > 25 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">Page {page} of {Math.ceil(total / 25)}</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-accent disabled:opacity-30"><ChevronLeft size={16} /></button>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 25)} className="p-1.5 rounded-lg hover:bg-accent disabled:opacity-30"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      <CreateTicketModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={fetchTickets} />
    </div>
  );
}
