'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Loader2, Plus, FileText, ChevronRight, Edit2, Trash2 } from 'lucide-react';

const fieldTypes = ['TEXT', 'TEXTAREA', 'NUMBER', 'SELECT', 'MULTI_SELECT', 'USER_SELECTOR', 'DEPARTMENT_SELECTOR', 'DATE', 'DATETIME', 'FILE_UPLOAD', 'IMAGE_UPLOAD', 'RICH_TEXT', 'CHECKBOX', 'RADIO_GROUP', 'ENTITY_REFERENCE'];

export default function FormsPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [schemas, setSchemas] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchema, setSelectedSchema] = useState<any>(null);
  const [showSchemaEditor, setShowSchemaEditor] = useState(false);
  const [schemaForm, setSchemaForm] = useState({ name: '', description: '', schema: { fields: [] as any[] } });

  const fetchData = async () => {
    setLoading(true);
    const [c, s, d] = await Promise.all([api.getCategories(), api.getFormSchemas(), api.getDepartments()]);
    setCategories(c); setSchemas(s); setDepartments(d); setLoading(false);
  };
  useEffect(() => { fetchData(); }, []);

  const addField = () => {
    setSchemaForm({
      ...schemaForm,
      schema: { fields: [...schemaForm.schema.fields, { id: `field_${Date.now()}`, type: 'TEXT', label: '', required: false, options: [] }] },
    });
  };

  const updateField = (index: number, data: any) => {
    const fields = [...schemaForm.schema.fields];
    fields[index] = { ...fields[index], ...data };
    setSchemaForm({ ...schemaForm, schema: { fields } });
  };

  const removeField = (index: number) => {
    setSchemaForm({ ...schemaForm, schema: { fields: schemaForm.schema.fields.filter((_: any, i: number) => i !== index) } });
  };

  const saveSchema = async () => {
    if (selectedSchema) {
      await api.updateFormSchema(selectedSchema.id, schemaForm);
    } else {
      await api.createFormSchema(schemaForm);
    }
    setShowSchemaEditor(false); fetchData();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-primary" size={24} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Form Builder</h1>
        <button onClick={() => { setSelectedSchema(null); setSchemaForm({ name: '', description: '', schema: { fields: [] } }); setShowSchemaEditor(true); }}
          className="flex items-center gap-2 h-10 px-5 bg-primary text-primary-foreground rounded-xl text-sm font-medium"><Plus size={16} /> New Schema</button>
      </div>

      {/* Existing categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="text-sm font-semibold mb-4">Request Categories & Subtypes</h3>
          <div className="space-y-3">
            {categories.map(cat => (
              <div key={cat.id} className="border border-border rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.department?.slug === 'design' ? '#8b5cf6' : cat.department?.slug === 'daf' ? '#10b981' : '#3b82f6' }} />
                  <span className="font-medium text-sm">{cat.name}</span>
                  <span className="text-xs text-muted-foreground">({cat.department?.name})</span>
                </div>
                <div className="space-y-1 pl-4">
                  {cat.subtypes?.map((st: any) => (
                    <div key={st.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <ChevronRight size={10} />
                      <span>{st.name}</span>
                      {st.formSchemaId && <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[10px]">has form</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="text-sm font-semibold mb-4">Form Schemas ({schemas.length})</h3>
          <div className="space-y-2">
            {schemas.map(s => (
              <div key={s.id} className="flex items-center gap-3 p-3 border border-border rounded-xl hover:bg-accent/50 cursor-pointer"
                onClick={() => { setSelectedSchema(s); setSchemaForm({ name: s.name, description: s.description || '', schema: s.schema }); setShowSchemaEditor(true); }}>
                <FileText size={16} className="text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{(s.schema as any)?.fields?.length || 0} fields &middot; v{s.version}</p>
                </div>
                <Edit2 size={14} className="text-muted-foreground" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Schema Editor Modal */}
      {showSchemaEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowSchemaEditor(false)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto m-4" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-bold">{selectedSchema ? 'Edit' : 'New'} Form Schema</h2>
              <button onClick={() => setShowSchemaEditor(false)} className="text-muted-foreground hover:text-foreground">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Schema Name</label>
                  <input className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm" value={schemaForm.name} onChange={e => setSchemaForm({...schemaForm, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <input className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm" value={schemaForm.description} onChange={e => setSchemaForm({...schemaForm, description: e.target.value})} />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Fields</h3>
                <button onClick={addField} className="flex items-center gap-1 text-xs text-primary hover:underline"><Plus size={12} /> Add Field</button>
              </div>

              <div className="space-y-3">
                {schemaForm.schema.fields.map((field: any, idx: number) => (
                  <div key={idx} className="border border-border rounded-xl p-4 space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <input placeholder="Field ID" className="h-9 px-3 rounded-lg bg-secondary border border-border text-xs" value={field.id} onChange={e => updateField(idx, { id: e.target.value })} />
                      <input placeholder="Label" className="h-9 px-3 rounded-lg bg-secondary border border-border text-xs" value={field.label} onChange={e => updateField(idx, { label: e.target.value })} />
                      <div className="flex gap-2">
                        <select className="flex-1 h-9 px-2 rounded-lg bg-secondary border border-border text-xs" value={field.type} onChange={e => updateField(idx, { type: e.target.value })}>
                          {fieldTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <button onClick={() => removeField(idx)} className="p-2 text-destructive hover:bg-destructive/10 rounded"><Trash2 size={12} /></button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <label className="flex items-center gap-1.5"><input type="checkbox" checked={field.required} onChange={e => updateField(idx, { required: e.target.checked })} /> Required</label>
                      {['SELECT', 'MULTI_SELECT', 'RADIO_GROUP'].includes(field.type) && (
                        <input placeholder="Options (comma separated)" className="flex-1 h-8 px-2 rounded-lg bg-secondary border border-border text-xs" value={(field.options || []).join(', ')} onChange={e => updateField(idx, { options: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) })} />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setShowSchemaEditor(false)} className="px-4 h-10 rounded-xl text-sm hover:bg-accent">Cancel</button>
                <button onClick={saveSchema} className="px-6 h-10 bg-primary text-primary-foreground rounded-xl text-sm font-medium">Save Schema</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
