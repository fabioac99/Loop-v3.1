'use client';
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2, Plus, FileText, ChevronRight, ChevronDown, Edit2, Trash2,
  GripVertical, ArrowUp, ArrowDown, Copy, Eye, Columns3, FolderTree, X,
} from 'lucide-react';

const FIELD_TYPES = [
  { value: 'TEXT', label: 'Text', icon: '𝐓' },
  { value: 'TEXTAREA', label: 'Text Area', icon: '¶' },
  { value: 'RICH_TEXT', label: 'Rich Text', icon: '📝' },
  { value: 'NUMBER', label: 'Number', icon: '#' },
  { value: 'SELECT', label: 'Dropdown', icon: '▾' },
  { value: 'MULTI_SELECT', label: 'Multi Select', icon: '☑' },
  { value: 'RADIO_GROUP', label: 'Radio Group', icon: '◉' },
  { value: 'CHECKBOX', label: 'Checkbox', icon: '☐' },
  { value: 'DATE', label: 'Date', icon: '📅' },
  { value: 'DATETIME', label: 'Date & Time', icon: '🕐' },
  { value: 'FILE_UPLOAD', label: 'File Upload', icon: '📎' },
  { value: 'IMAGE_UPLOAD', label: 'Image Upload', icon: '🖼' },
  { value: 'USER_SELECTOR', label: 'User Selector', icon: '👤' },
  { value: 'DEPARTMENT_SELECTOR', label: 'Department', icon: '🏢' },
  { value: 'ENTITY_REFERENCE', label: 'Entity Ref', icon: '🔗' },
  { value: 'ENTITY_TYPE', label: '🏷️ Client/Supplier', icon: '🏷️' },
  { value: 'REPEATER', label: '📋 Table / Repeater', icon: '📋' },
  { value: 'GROUP', label: '📁 Sub-form Group', icon: '📁' },
];

const COL_OPTIONS = [
  { value: 12, label: 'Full width (1/1)' },
  { value: 6, label: 'Half (1/2)' },
  { value: 4, label: 'Third (1/3)' },
  { value: 3, label: 'Quarter (1/4)' },
  { value: 8, label: 'Two thirds (2/3)' },
  { value: 9, label: 'Three quarters (3/4)' },
];

function makeField(): any {
  return {
    id: `field_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'TEXT', label: '', required: false, options: [],
    colSpan: 12, // default full width
    placeholder: '',
    children: [], // for GROUP type
    columns: [], // for REPEATER type — defines table columns
    minRows: 1, maxRows: 50, // for REPEATER
    condition: null,
  };
}

function makeRepeaterColumn(): any {
  return {
    id: `col_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'TEXT', label: '', width: 'auto',
    options: [], placeholder: '', required: false,
  };
}

/* ============================== FIELD EDITOR (RECURSIVE) ============================== */
function FieldEditor({
  field, index, total, path,
  onUpdate, onRemove, onMove, onDuplicate, onAddChild,
  depth = 0,
}: {
  field: any; index: number; total: number; path: number[];
  onUpdate: (path: number[], data: any) => void;
  onRemove: (path: number[]) => void;
  onMove: (path: number[], direction: 'up' | 'down') => void;
  onDuplicate: (path: number[]) => void;
  onAddChild: (path: number[]) => void;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const isGroup = field.type === 'GROUP';
  const isRepeater = field.type === 'REPEATER';
  const hasOptions = ['SELECT', 'MULTI_SELECT', 'RADIO_GROUP'].includes(field.type);

  const depthColors = ['border-l-primary', 'border-l-amber-400', 'border-l-emerald-400', 'border-l-purple-400', 'border-l-rose-400'];
  const depthColor = depthColors[depth % depthColors.length];

  return (
    <div className={`border border-border rounded-xl overflow-hidden ${depth > 0 ? `border-l-[3px] ${depthColor}` : ''}`}>
      {/* Header */}
      <div className={`flex items-center gap-2 px-3 py-2 ${isGroup ? 'bg-accent/60' : isRepeater ? 'bg-amber-500/[0.07]' : 'bg-card'}`}>
        <GripVertical size={14} className="text-muted-foreground cursor-grab shrink-0" />

        {/* Expand/collapse for groups and repeaters */}
        {(isGroup || isRepeater) && (
          <button onClick={() => setExpanded(!expanded)} className="p-0.5 hover:bg-accent rounded">
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        )}

        {/* Type badge */}
        <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${isGroup ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground'}`}>
          {FIELD_TYPES.find(t => t.value === field.type)?.icon} {field.type}
        </span>

        {/* Label */}
        <span className="text-xs font-medium truncate flex-1">{field.label || '(unnamed)'}</span>

        {/* Column width indicator */}
        <span className="text-[10px] text-muted-foreground shrink-0">{field.colSpan}/12</span>

        {/* Actions */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={() => onMove(path, 'up')} disabled={index === 0} className="p-1 rounded hover:bg-accent text-muted-foreground disabled:opacity-20"><ArrowUp size={12} /></button>
          <button onClick={() => onMove(path, 'down')} disabled={index === total - 1} className="p-1 rounded hover:bg-accent text-muted-foreground disabled:opacity-20"><ArrowDown size={12} /></button>
          <button onClick={() => onDuplicate(path)} className="p-1 rounded hover:bg-accent text-muted-foreground"><Copy size={12} /></button>
          <button onClick={() => onRemove(path)} className="p-1 rounded hover:bg-destructive/20 text-destructive"><Trash2 size={12} /></button>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-3">
        {/* Row 1: ID, Label, Type */}
        <div className="grid grid-cols-12 gap-2">
          <div className="col-span-3">
            <label className="block text-[10px] text-muted-foreground mb-0.5">Field ID</label>
            <input className="w-full h-8 px-2 rounded-lg bg-secondary border border-border text-xs" value={field.id} onChange={e => onUpdate(path, { id: e.target.value })} />
          </div>
          <div className="col-span-3">
            <label className="block text-[10px] text-muted-foreground mb-0.5">Label</label>
            <input className="w-full h-8 px-2 rounded-lg bg-secondary border border-border text-xs" value={field.label} onChange={e => onUpdate(path, { label: e.target.value })} placeholder="Field label" />
          </div>
          <div className="col-span-2">
            <label className="block text-[10px] text-muted-foreground mb-0.5">Type</label>
            <select className="w-full h-8 px-1 rounded-lg bg-secondary border border-border text-xs" value={field.type} onChange={e => onUpdate(path, { type: e.target.value, ...(e.target.value === 'GROUP' ? { children: field.children || [] } : {}) })}>
              {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-[10px] text-muted-foreground mb-0.5">Width</label>
            <select className="w-full h-8 px-1 rounded-lg bg-secondary border border-border text-xs" value={field.colSpan || 12} onChange={e => onUpdate(path, { colSpan: parseInt(e.target.value) })}>
              {COL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="col-span-2 flex items-end gap-2 pb-0.5">
            <label className="flex items-center gap-1 text-[10px] cursor-pointer">
              <input type="checkbox" checked={field.required || false} onChange={e => onUpdate(path, { required: e.target.checked })} className="rounded" /> Required
            </label>
          </div>
        </div>

        {/* Row 2: Placeholder / Options / Condition */}
        <div className="grid grid-cols-12 gap-2">
          {!isGroup && (
            <div className="col-span-4">
              <label className="block text-[10px] text-muted-foreground mb-0.5">Placeholder</label>
              <input className="w-full h-8 px-2 rounded-lg bg-secondary border border-border text-xs" value={field.placeholder || ''} onChange={e => onUpdate(path, { placeholder: e.target.value })} />
            </div>
          )}
          {hasOptions && (
            <div className="col-span-5">
              <label className="block text-[10px] text-muted-foreground mb-0.5">Options (comma-separated)</label>
              <input className="w-full h-8 px-2 rounded-lg bg-secondary border border-border text-xs" value={(field.options || []).join(', ')} onChange={e => onUpdate(path, { options: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) })} />
            </div>
          )}
          <div className={`${hasOptions ? 'col-span-3' : isGroup ? 'col-span-6' : 'col-span-4'}`}>
            <label className="block text-[10px] text-muted-foreground mb-0.5">Condition (field_id=value)</label>
            <input className="w-full h-8 px-2 rounded-lg bg-secondary border border-border text-xs" value={field.condition ? `${field.condition.field}=${field.condition.value}` : ''} onChange={e => {
              const parts = e.target.value.split('=');
              if (parts.length === 2 && parts[0] && parts[1]) {
                onUpdate(path, { condition: { field: parts[0].trim(), value: parts[1].trim() } });
              } else if (!e.target.value) {
                onUpdate(path, { condition: null });
              }
            }} placeholder="other_field=some_value" />
          </div>
          {isGroup && (
            <div className="col-span-6">
              <label className="block text-[10px] text-muted-foreground mb-0.5">Group description</label>
              <input className="w-full h-8 px-2 rounded-lg bg-secondary border border-border text-xs" value={field.description || ''} onChange={e => onUpdate(path, { description: e.target.value })} placeholder="Optional description for this section" />
            </div>
          )}
        </div>
      </div>

      {/* Children (for GROUP type) */}
      {isGroup && expanded && (
        <div className="border-t border-border bg-accent/20 p-3 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <FolderTree size={10} /> Nested fields ({(field.children || []).length})
            </span>
            <button onClick={() => onAddChild(path)} className="flex items-center gap-1 text-[10px] text-primary hover:underline"><Plus size={10} /> Add nested field</button>
          </div>
          {(field.children || []).length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
              No nested fields yet — click "Add nested field" to build the sub-form
            </p>
          ) : (
            <div className="space-y-2">
              {field.children.map((child: any, childIdx: number) => (
                <FieldEditor
                  key={child.id}
                  field={child}
                  index={childIdx}
                  total={field.children.length}
                  path={[...path, childIdx]}
                  onUpdate={onUpdate}
                  onRemove={onRemove}
                  onMove={onMove}
                  onDuplicate={onDuplicate}
                  onAddChild={onAddChild}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Columns (for REPEATER type) */}
      {isRepeater && expanded && (
        <div className="border-t border-border bg-amber-500/[0.04] p-3 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              📋 Table columns ({(field.columns || []).length})
            </span>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
                Min rows: <input type="number" className="w-10 h-6 px-1 rounded bg-secondary border border-border text-[10px] text-center" value={field.minRows || 1} onChange={e => onUpdate(path, { minRows: parseInt(e.target.value) || 1 })} />
              </label>
              <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
                Max rows: <input type="number" className="w-10 h-6 px-1 rounded bg-secondary border border-border text-[10px] text-center" value={field.maxRows || 50} onChange={e => onUpdate(path, { maxRows: parseInt(e.target.value) || 50 })} />
              </label>
              <button onClick={() => {
                const cols = [...(field.columns || []), makeRepeaterColumn()];
                onUpdate(path, { columns: cols });
              }} className="flex items-center gap-1 text-[10px] text-primary hover:underline"><Plus size={10} /> Add column</button>
            </div>
          </div>

          {(field.columns || []).length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
              No columns defined — add columns to define the table structure
            </p>
          ) : (
            <>
              {/* Column headers row */}
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${field.columns.length}, 1fr) 36px` }}>
                {field.columns.map((col: any, ci: number) => (
                  <div key={col.id} className="border border-border rounded-lg p-2.5 bg-card space-y-2">
                    <div className="flex items-center gap-1">
                      <input className="flex-1 h-7 px-2 rounded bg-secondary border border-border text-[11px] font-medium" value={col.label} onChange={e => {
                        const cols = [...field.columns]; cols[ci] = { ...cols[ci], label: e.target.value }; onUpdate(path, { columns: cols });
                      }} placeholder="Column header" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <select className="flex-1 h-6 px-1 rounded bg-secondary border border-border text-[10px]" value={col.type} onChange={e => {
                        const cols = [...field.columns]; cols[ci] = { ...cols[ci], type: e.target.value }; onUpdate(path, { columns: cols });
                      }}>
                        <option value="TEXT">Text</option>
                        <option value="NUMBER">Number</option>
                        <option value="SELECT">Dropdown</option>
                        <option value="DATE">Date</option>
                        <option value="CHECKBOX">Checkbox</option>
                        <option value="TEXTAREA">Textarea</option>
                      </select>
                      <label className="flex items-center gap-0.5 text-[10px]">
                        <input type="checkbox" checked={col.required || false} onChange={e => {
                          const cols = [...field.columns]; cols[ci] = { ...cols[ci], required: e.target.checked }; onUpdate(path, { columns: cols });
                        }} className="rounded" /> Req
                      </label>
                    </div>
                    {col.type === 'SELECT' && (
                      <input className="w-full h-6 px-2 rounded bg-secondary border border-border text-[10px]" value={(col.options || []).join(', ')} onChange={e => {
                        const cols = [...field.columns]; cols[ci] = { ...cols[ci], options: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) }; onUpdate(path, { columns: cols });
                      }} placeholder="Options (comma-separated)" />
                    )}
                  </div>
                ))}
                {/* Remove column buttons */}
                <div className="flex flex-col gap-1 justify-center">
                  {field.columns.map((_: any, ci: number) => (
                    <button key={ci} onClick={() => {
                      const cols = field.columns.filter((__: any, i: number) => i !== ci);
                      onUpdate(path, { columns: cols });
                    }} className="w-7 h-7 rounded flex items-center justify-center hover:bg-destructive/20 text-destructive"><Trash2 size={10} /></button>
                  ))}
                </div>
              </div>

              {/* Preview row */}
              <div className="mt-2">
                <p className="text-[10px] text-muted-foreground mb-1">Preview:</p>
                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="grid bg-accent/50" style={{ gridTemplateColumns: `repeat(${field.columns.length}, 1fr) 60px` }}>
                    {field.columns.map((col: any) => (
                      <div key={col.id} className="px-2 py-1.5 text-[10px] font-semibold border-r border-border last:border-r-0">
                        {col.label || 'Untitled'} {col.required && <span className="text-destructive">*</span>}
                      </div>
                    ))}
                    <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground">Actions</div>
                  </div>
                  <div className="grid border-t border-border" style={{ gridTemplateColumns: `repeat(${field.columns.length}, 1fr) 60px` }}>
                    {field.columns.map((col: any) => (
                      <div key={col.id} className="px-2 py-1.5 border-r border-border last:border-r-0">
                        <div className="h-6 rounded bg-secondary border border-border" />
                      </div>
                    ))}
                    <div className="px-2 py-1.5 text-[10px] text-destructive">Remove</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================== FORM PREVIEW ============================== */
function FormPreview({ fields }: { fields: any[] }) {
  const renderField = (field: any) => {
    if (field.type === 'GROUP') {
      return (
        <div key={field.id} className="border border-border rounded-xl p-4 bg-card/50" style={{ gridColumn: `span ${field.colSpan || 12}` }}>
          <h4 className="text-sm font-semibold mb-1">{field.label || 'Untitled Group'}</h4>
          {field.description && <p className="text-xs text-muted-foreground mb-3">{field.description}</p>}
          <div className="grid grid-cols-12 gap-3">
            {(field.children || []).map((child: any) => renderField(child))}
          </div>
        </div>
      );
    }
    if (field.type === 'REPEATER') {
      const cols = field.columns || [];
      return (
        <div key={field.id} style={{ gridColumn: `span ${field.colSpan || 12}` }}>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium">{field.label || 'Table'} {field.required && <span className="text-destructive">*</span>}</label>
            <span className="text-[10px] text-primary cursor-pointer hover:underline">+ Add row</span>
          </div>
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="grid bg-accent/50" style={{ gridTemplateColumns: `repeat(${cols.length}, 1fr) 60px` }}>
              {cols.map((col: any) => (
                <div key={col.id} className="px-3 py-2 text-[10px] font-semibold border-r border-border last:border-r-0">{col.label || 'Col'}{col.required ? ' *' : ''}</div>
              ))}
              <div className="px-2 py-2 text-[10px] text-muted-foreground" />
            </div>
            <div className="grid border-t border-border" style={{ gridTemplateColumns: `repeat(${cols.length}, 1fr) 60px` }}>
              {cols.map((col: any) => (
                <div key={col.id} className="px-2 py-1.5 border-r border-border last:border-r-0"><div className="h-7 rounded bg-secondary border border-border" /></div>
              ))}
              <div className="px-2 py-1.5 flex items-center justify-center"><span className="text-[10px] text-destructive cursor-pointer">Remove</span></div>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Rows: {field.minRows || 1}–{field.maxRows || 50}</p>
        </div>
      );
    }
    return (
      <div key={field.id} style={{ gridColumn: `span ${field.colSpan || 12}` }}>
        <label className="block text-xs font-medium mb-1">
          {field.label || 'Untitled'} {field.required && <span className="text-destructive">*</span>}
        </label>
        {field.type === 'TEXTAREA' || field.type === 'RICH_TEXT' ? (
          <div className="w-full h-16 rounded-lg bg-secondary border border-border" />
        ) : field.type === 'SELECT' || field.type === 'MULTI_SELECT' || field.type === 'RADIO_GROUP' ? (
          <div className="w-full h-9 rounded-lg bg-secondary border border-border flex items-center px-3 text-xs text-muted-foreground">
            {field.options?.length ? field.options.slice(0, 3).join(', ') + (field.options.length > 3 ? '...' : '') : 'Select...'}
          </div>
        ) : field.type === 'CHECKBOX' ? (
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" disabled className="rounded" /> {field.label}</label>
        ) : field.type === 'FILE_UPLOAD' || field.type === 'IMAGE_UPLOAD' ? (
          <div className="w-full h-16 border-2 border-dashed border-border rounded-lg flex items-center justify-center text-xs text-muted-foreground">Drop file here</div>
        ) : (
          <div className="w-full h-9 rounded-lg bg-secondary border border-border flex items-center px-3 text-xs text-muted-foreground">
            {field.placeholder || field.type}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-12 gap-3">
      {fields.map((f: any) => renderField(f))}
    </div>
  );
}

/* ============================== CATEGORY / SUBTYPE MODAL ============================== */
function CatSubtypeModal({ config, onClose, onSaved, departments, schemas }: {
  config: { open: boolean; mode: string; data: any };
  onClose: () => void; onSaved: () => void;
  departments: any[]; schemas: any[];
}) {
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (config.open) { setForm({ ...config.data }); setError(''); }
  }, [config]);

  if (!config.open) return null;

  const isCategory = config.mode.includes('category');
  const isCreate = config.mode.startsWith('create');
  const title = `${isCreate ? 'Create' : 'Edit'} ${isCategory ? 'Category' : 'Request Type'}`;

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      if (config.mode === 'create-category') {
        await api.createCategory({
          name: form.name, slug: form.slug || form.name.toLowerCase().replace(/\s+/g, '-'),
          departmentId: form.departmentId, description: form.description,
        });
      } else if (config.mode === 'edit-category') {
        await api.updateCategory(form.id, {
          name: form.name, slug: form.slug, description: form.description,
        });
      } else if (config.mode === 'create-subtype') {
        await api.createSubtype({
          name: form.name,
          slug: form.slug || form.name.toLowerCase().replace(/\s+/g, '-'),
          categoryId: form.categoryId,
          formSchemaId: form.formSchemaId || null,
          description: form.description || null,
          slaResponseHours: form.slaResponseHours ? parseInt(form.slaResponseHours) : null,
          slaResolutionHours: form.slaResolutionHours ? parseInt(form.slaResolutionHours) : null,
          defaultPriority: form.defaultPriority || 'NORMAL',
        });
      } else if (config.mode === 'edit-subtype') {
        await api.updateSubtype(form.id, {
          name: form.name,
          slug: form.slug,
          formSchemaId: form.formSchemaId || null,
          description: form.description || null,
          slaResponseHours: form.slaResponseHours ? parseInt(form.slaResponseHours) : null,
          slaResolutionHours: form.slaResolutionHours ? parseInt(form.slaResolutionHours) : null,
          defaultPriority: form.defaultPriority || 'NORMAL',
        });
      }
      onSaved(); onClose();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg m-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-bold">{title}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent text-muted-foreground"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1">Name <span className="text-destructive">*</span></label>
            <input className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={isCategory ? 'e.g. IT Support' : 'e.g. Password Reset'} />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm font-medium mb-1">Slug</label>
            <input className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm" value={form.slug || ''} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="auto-generated from name" />
          </div>

          {/* Department (only for category creation) */}
          {isCategory && (
            <div>
              <label className="block text-sm font-medium mb-1">Department <span className="text-destructive">*</span></label>
              <select className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm" value={form.departmentId || ''} onChange={e => setForm({ ...form, departmentId: e.target.value })}>
                <option value="">Select department</option>
                {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          )}

          {/* Form Schema (only for subtype) */}
          {!isCategory && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Linked Form Schema
                  <span className="text-muted-foreground font-normal ml-1">(optional)</span>
                </label>
                <select className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm" value={form.formSchemaId || ''} onChange={e => setForm({ ...form, formSchemaId: e.target.value })}>
                  <option value="">No form — general request</option>
                  {schemas.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({((s.schema as any)?.fields || []).length} fields, v{s.version})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground mt-1">When set, users will see this form when creating a request of this type</p>
              </div>

              {/* SLA */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">SLA Response (hrs)</label>
                  <input type="number" className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm" value={form.slaResponseHours || ''} onChange={e => setForm({ ...form, slaResponseHours: e.target.value })} placeholder="24" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">SLA Resolution (hrs)</label>
                  <input type="number" className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm" value={form.slaResolutionHours || ''} onChange={e => setForm({ ...form, slaResolutionHours: e.target.value })} placeholder="72" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Default Priority</label>
                  <select className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm" value={form.defaultPriority || 'NORMAL'} onChange={e => setForm({ ...form, defaultPriority: e.target.value })}>
                    {['LOW', 'NORMAL', 'HIGH', 'URGENT'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea className="w-full h-20 px-3 py-2 rounded-lg bg-secondary border border-border text-sm resize-none" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional description..." />
          </div>

          {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-4 h-10 rounded-xl text-sm hover:bg-accent">Cancel</button>
            <button onClick={handleSave} disabled={saving || !form.name} className="px-5 h-10 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
              {saving && <Loader2 className="animate-spin" size={14} />}
              {isCreate ? 'Create' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================== MAIN PAGE ============================== */
export default function FormsPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [schemas, setSchemas] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchema, setSelectedSchema] = useState<any>(null);
  const [showSchemaEditor, setShowSchemaEditor] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [schemaForm, setSchemaForm] = useState({ name: '', description: '', schema: { fields: [] as any[] } });
  const [catModal, setCatModal] = useState<{ open: boolean; mode: string; data: any }>({ open: false, mode: '', data: {} });

  const fetchData = async () => {
    setLoading(true);
    const [c, s, d] = await Promise.all([api.getCategories(), api.getFormSchemas(), api.getDepartments()]);
    setCategories(c); setSchemas(s); setDepartments(d); setLoading(false);
  };
  useEffect(() => { fetchData(); }, []);

  // Deep field operations using path arrays
  const getFieldsAtPath = useCallback((fields: any[], path: number[]): { parent: any[]; index: number } => {
    if (path.length === 1) return { parent: fields, index: path[0] };
    let current = fields;
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]].children || [];
    }
    return { parent: current, index: path[path.length - 1] };
  }, []);

  const updateFieldAtPath = useCallback((path: number[], data: any) => {
    const newFields = JSON.parse(JSON.stringify(schemaForm.schema.fields));
    const { parent, index } = getFieldsAtPath(newFields, path);
    parent[index] = { ...parent[index], ...data };
    setSchemaForm({ ...schemaForm, schema: { fields: newFields } });
  }, [schemaForm, getFieldsAtPath]);

  const removeFieldAtPath = useCallback((path: number[]) => {
    const newFields = JSON.parse(JSON.stringify(schemaForm.schema.fields));
    const { parent, index } = getFieldsAtPath(newFields, path);
    parent.splice(index, 1);
    setSchemaForm({ ...schemaForm, schema: { fields: newFields } });
  }, [schemaForm, getFieldsAtPath]);

  const moveFieldAtPath = useCallback((path: number[], direction: 'up' | 'down') => {
    const newFields = JSON.parse(JSON.stringify(schemaForm.schema.fields));
    const { parent, index } = getFieldsAtPath(newFields, path);
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= parent.length) return;
    [parent[index], parent[newIndex]] = [parent[newIndex], parent[index]];
    setSchemaForm({ ...schemaForm, schema: { fields: newFields } });
  }, [schemaForm, getFieldsAtPath]);

  const duplicateFieldAtPath = useCallback((path: number[]) => {
    const newFields = JSON.parse(JSON.stringify(schemaForm.schema.fields));
    const { parent, index } = getFieldsAtPath(newFields, path);
    const clone = JSON.parse(JSON.stringify(parent[index]));
    clone.id = `${clone.id}_copy_${Date.now().toString(36)}`;
    clone.label = `${clone.label} (copy)`;
    parent.splice(index + 1, 0, clone);
    setSchemaForm({ ...schemaForm, schema: { fields: newFields } });
  }, [schemaForm, getFieldsAtPath]);

  const addChildAtPath = useCallback((path: number[]) => {
    const newFields = JSON.parse(JSON.stringify(schemaForm.schema.fields));
    const { parent, index } = getFieldsAtPath(newFields, path);
    if (!parent[index].children) parent[index].children = [];
    parent[index].children.push(makeField());
    setSchemaForm({ ...schemaForm, schema: { fields: newFields } });
  }, [schemaForm, getFieldsAtPath]);

  const addTopField = () => {
    setSchemaForm({
      ...schemaForm,
      schema: { fields: [...schemaForm.schema.fields, makeField()] },
    });
  };

  const addTopGroup = () => {
    const group = makeField();
    group.type = 'GROUP';
    group.label = 'Section';
    group.children = [];
    setSchemaForm({
      ...schemaForm,
      schema: { fields: [...schemaForm.schema.fields, group] },
    });
  };

  const saveSchema = async () => {
    if (!schemaForm.name?.trim()) {
      alert('Please enter a schema name');
      return;
    }
    if (selectedSchema) {
      await api.updateFormSchema(selectedSchema.id, schemaForm);
    } else {
      await api.createFormSchema(schemaForm);
    }
    setShowSchemaEditor(false); fetchData();
  };

  const countFields = (fields: any[]): number => {
    let count = 0;
    for (const f of fields) {
      count++;
      if (f.children?.length) count += countFields(f.children);
    }
    return count;
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-primary" size={24} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Form Builder</h1>
        <button onClick={() => { setSelectedSchema(null); setSchemaForm({ name: '', description: '', schema: { fields: [] } }); setShowPreview(false); setShowSchemaEditor(true); }}
          className="flex items-center gap-2 h-10 px-5 bg-primary text-primary-foreground rounded-xl text-sm font-medium"><Plus size={16} /> New Schema</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ===== Categories & Subtypes (with full CRUD + schema linking) ===== */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Request Categories & Subtypes</h3>
            <button onClick={() => {
              setCatModal({ open: true, mode: 'create-category', data: { name: '', slug: '', departmentId: '', description: '' } });
            }} className="flex items-center gap-1 text-xs text-primary hover:underline"><Plus size={12} /> Category</button>
          </div>
          <div className="space-y-3">
            {categories.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No categories yet</p>}
            {categories.map(cat => (
              <div key={cat.id} className="border border-border rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2.5 bg-accent/30">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.department?.color || '#6366f1' }} />
                  <span className="font-medium text-sm flex-1">{cat.name}</span>
                  <span className="text-[10px] text-muted-foreground">{cat.department?.name}</span>
                  <button onClick={() => setCatModal({
                    open: true, mode: 'edit-category',
                    data: { id: cat.id, name: cat.name, slug: cat.slug, departmentId: cat.departmentId, description: cat.description || '' }
                  })} className="p-1 rounded hover:bg-accent text-muted-foreground"><Edit2 size={11} /></button>
                  <button onClick={() => setCatModal({
                    open: true, mode: 'create-subtype',
                    data: { name: '', slug: '', categoryId: cat.id, formSchemaId: '', slaResponseHours: '', slaResolutionHours: '', defaultPriority: 'NORMAL', description: '' }
                  })} className="p-1 rounded hover:bg-accent text-primary" title="Add subtype"><Plus size={11} /></button>
                </div>
                {cat.subtypes?.length > 0 && (
                  <div className="divide-y divide-border">
                    {cat.subtypes.map((st: any) => {
                      const linkedSchema = schemas.find((s: any) => s.id === st.formSchemaId);
                      return (
                        <div key={st.id} className="flex items-center gap-2 px-4 py-2 text-xs hover:bg-accent/20 group">
                          <ChevronRight size={10} className="text-muted-foreground shrink-0" />
                          <span className="font-medium flex-1">{st.name}</span>
                          {linkedSchema ? (
                            <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[10px] flex items-center gap-1 shrink-0">
                              <FileText size={8} /> {linkedSchema.name}
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-500 rounded text-[10px] shrink-0">no form</span>
                          )}
                          <button onClick={() => setCatModal({
                            open: true, mode: 'edit-subtype',
                            data: {
                              id: st.id, name: st.name, slug: st.slug || '', categoryId: st.categoryId,
                              formSchemaId: st.formSchemaId || '', description: st.description || '',
                              slaResponseHours: st.slaResponseHours || '', slaResolutionHours: st.slaResolutionHours || '',
                              defaultPriority: st.defaultPriority || 'NORMAL',
                            }
                          })} className="p-1 rounded hover:bg-accent text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"><Edit2 size={11} /></button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ===== Form Schemas ===== */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="text-sm font-semibold mb-4">Form Schemas ({schemas.length})</h3>
          <div className="space-y-2">
            {schemas.map(s => {
              // Find which subtypes use this schema
              const linkedSubtypes = categories.flatMap((c: any) =>
                (c.subtypes || []).filter((st: any) => st.formSchemaId === s.id).map((st: any) => ({ ...st, categoryName: c.name }))
              );
              return (
                <div key={s.id} className="border border-border rounded-xl hover:bg-accent/30 cursor-pointer overflow-hidden"
                  onClick={() => { setSelectedSchema(s); setSchemaForm({ name: s.name, description: s.description || '', schema: s.schema || { fields: [] } }); setShowPreview(false); setShowSchemaEditor(true); }}>
                  <div className="flex items-center gap-3 p-3">
                    <FileText size={16} className="text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{countFields((s.schema as any)?.fields || [])} fields &middot; v{s.version}</p>
                    </div>
                    <Edit2 size={14} className="text-muted-foreground shrink-0" />
                  </div>
                  {linkedSubtypes.length > 0 && (
                    <div className="px-3 pb-2.5 flex flex-wrap gap-1">
                      {linkedSubtypes.map((st: any) => (
                        <span key={st.id} className="text-[10px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 rounded">
                          {st.categoryName} → {st.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ===== Category/Subtype Create/Edit Modal ===== */}
      <CatSubtypeModal
        config={catModal}
        onClose={() => setCatModal({ ...catModal, open: false })}
        onSaved={fetchData}
        departments={departments}
        schemas={schemas}
      />

      {/* Schema Editor — full screen overlay */}
      {showSchemaEditor && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
          {/* Top bar */}
          <div className="h-14 border-b border-border flex items-center px-6 gap-4 shrink-0 bg-card">
            <button onClick={() => setShowSchemaEditor(false)} className="p-2 rounded-lg hover:bg-accent text-muted-foreground"><X size={18} /></button>
            <div className="flex-1">
              <input className="text-lg font-bold bg-transparent border-0 outline-none w-full" value={schemaForm.name} onChange={e => setSchemaForm({...schemaForm, name: e.target.value})} placeholder="Schema name" />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowPreview(!showPreview)} className={`flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium border transition-colors ${showPreview ? 'bg-primary/10 text-primary border-primary/30' : 'border-border hover:bg-accent'}`}>
                <Eye size={14} /> {showPreview ? 'Editor' : 'Preview'}
              </button>
              <button onClick={saveSchema} className="h-9 px-5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90">Save Schema</button>
            </div>
          </div>

          {/* Description */}
          <div className="px-6 py-3 border-b border-border bg-card/50">
            <input className="w-full text-sm bg-transparent border-0 outline-none text-muted-foreground" value={schemaForm.description} onChange={e => setSchemaForm({...schemaForm, description: e.target.value})} placeholder="Schema description (optional)" />
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {showPreview ? (
              <div className="max-w-3xl mx-auto">
                <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">Form Preview</h3>
                <div className="bg-card border border-border rounded-2xl p-6">
                  {schemaForm.schema.fields.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No fields yet</p>
                  ) : (
                    <FormPreview fields={schemaForm.schema.fields} />
                  )}
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-3">
                {/* Add buttons */}
                <div className="flex items-center gap-2 mb-4">
                  <button onClick={addTopField} className="flex items-center gap-1.5 h-9 px-4 bg-secondary border border-border rounded-lg text-xs font-medium hover:bg-accent transition-colors">
                    <Plus size={12} /> Add Field
                  </button>
                  <button onClick={addTopGroup} className="flex items-center gap-1.5 h-9 px-4 bg-primary/10 text-primary border border-primary/20 rounded-lg text-xs font-medium hover:bg-primary/20 transition-colors">
                    <FolderTree size={12} /> Add Group / Section
                  </button>
                  <span className="text-xs text-muted-foreground ml-2">{countFields(schemaForm.schema.fields)} fields total</span>
                </div>

                {/* Fields */}
                {schemaForm.schema.fields.length === 0 ? (
                  <div className="border-2 border-dashed border-border rounded-2xl py-16 text-center">
                    <Columns3 size={32} className="mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground mb-1">No fields yet</p>
                    <p className="text-xs text-muted-foreground">Click "Add Field" to start building, or "Add Group" to create nested sections</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {schemaForm.schema.fields.map((field: any, idx: number) => (
                      <FieldEditor
                        key={field.id}
                        field={field}
                        index={idx}
                        total={schemaForm.schema.fields.length}
                        path={[idx]}
                        onUpdate={updateFieldAtPath}
                        onRemove={removeFieldAtPath}
                        onMove={moveFieldAtPath}
                        onDuplicate={duplicateFieldAtPath}
                        onAddChild={addChildAtPath}
                      />
                    ))}
                  </div>
                )}

                {/* Add more at bottom */}
                {schemaForm.schema.fields.length > 0 && (
                  <div className="flex items-center gap-2 pt-2">
                    <button onClick={addTopField} className="flex items-center gap-1 text-xs text-primary hover:underline"><Plus size={12} /> Add field</button>
                    <span className="text-muted-foreground text-xs">|</span>
                    <button onClick={addTopGroup} className="flex items-center gap-1 text-xs text-primary hover:underline"><FolderTree size={12} /> Add group</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
