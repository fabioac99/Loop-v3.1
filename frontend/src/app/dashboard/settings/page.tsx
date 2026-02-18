'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Settings, Save, Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.getSettings().then(setSettings).finally(() => setLoading(false)); }, []);

  const handleSave = async () => {
    setSaving(true);
    try { await api.updateSettings(settings); } finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-primary" size={24} /></div>;

  const fields = [
    { key: 'ticketPrefix', label: 'Ticket Prefix', type: 'text' },
    { key: 'maxUploadSize', label: 'Max Upload Size (bytes)', type: 'number' },
    { key: 'defaultPriority', label: 'Default Priority', type: 'select', options: ['LOW', 'NORMAL', 'HIGH', 'URGENT'] },
    { key: 'slaResponseHours', label: 'SLA Response Hours', type: 'number' },
    { key: 'slaResolutionHours', label: 'SLA Resolution Hours', type: 'number' },
    { key: 'smtpHost', label: 'SMTP Host', type: 'text' },
    { key: 'smtpPort', label: 'SMTP Port', type: 'number' },
    { key: 'smtpUser', label: 'SMTP User', type: 'text' },
    { key: 'smtpFrom', label: 'SMTP From', type: 'text' },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3"><Settings size={24} className="text-primary" /><h1 className="text-2xl font-bold">System Settings</h1></div>
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        {fields.map(f => (
          <div key={f.key}>
            <label className="block text-sm font-medium mb-1.5">{f.label}</label>
            {f.type === 'select' ? (
              <select className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm" value={settings[f.key] || ''} onChange={e => setSettings({...settings, [f.key]: e.target.value})}>
                {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input type={f.type} className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm" value={settings[f.key] || ''} onChange={e => setSettings({...settings, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value})} />
            )}
          </div>
        ))}
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 h-10 px-6 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50">
          {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Save Settings
        </button>
      </div>
    </div>
  );
}
