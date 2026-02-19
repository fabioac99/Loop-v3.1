'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Settings, Save, Loader2, Bell, BellOff } from 'lucide-react';

const EVENT_TYPE_INFO: Record<string, { icon: string; color: string }> = {
  TICKET_CREATED: { icon: '🎫', color: 'bg-blue-500/10 text-blue-500' },
  TICKET_ASSIGNED: { icon: '👤', color: 'bg-purple-500/10 text-purple-500' },
  STATUS_CHANGED: { icon: '🔄', color: 'bg-amber-500/10 text-amber-500' },
  NEW_MESSAGE: { icon: '💬', color: 'bg-emerald-500/10 text-emerald-500' },
  TICKET_WATCHER_ADDED: { icon: '👁', color: 'bg-indigo-500/10 text-indigo-500' },
  SLA_WARNING: { icon: '⏰', color: 'bg-orange-500/10 text-orange-500' },
  SLA_BREACH: { icon: '🚨', color: 'bg-red-500/10 text-red-500' },
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Notification preferences
  const [notifPrefs, setNotifPrefs] = useState<any[]>([]);
  const [notifLoading, setNotifLoading] = useState(true);
  const [notifSaving, setNotifSaving] = useState(false);

  useEffect(() => {
    api.getSettings().then(setSettings).finally(() => setLoading(false));
    api.getNotificationPreferences().then(setNotifPrefs).catch(() => {}).finally(() => setNotifLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try { await api.updateSettings(settings); } finally { setSaving(false); }
  };

  const handleNotifSave = async () => {
    setNotifSaving(true);
    try {
      const result = await api.updateNotificationPreferences(notifPrefs);
      setNotifPrefs(result);
    } finally { setNotifSaving(false); }
  };

  const toggleNotif = (eventType: string) => {
    setNotifPrefs(notifPrefs.map(p =>
      p.eventType === eventType ? { ...p, enabled: !p.enabled } : p
    ));
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

      {/* General Settings */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-semibold">General</h2>
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

      {/* Notification Preferences */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <Bell size={18} className="text-primary" />
          <div>
            <h2 className="text-sm font-semibold">Notification Preferences</h2>
            <p className="text-xs text-muted-foreground">Control which notifications are sent to users across the platform</p>
          </div>
        </div>

        {notifLoading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="animate-spin text-primary" size={20} /></div>
        ) : notifPrefs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No notification preferences configured. Run the migration SQL to seed defaults.</p>
        ) : (
          <div className="space-y-2">
            {notifPrefs.map((pref) => {
              const info = EVENT_TYPE_INFO[pref.eventType] || { icon: '🔔', color: 'bg-zinc-500/10 text-zinc-500' };
              return (
                <div key={pref.eventType}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                    pref.enabled ? 'border-border bg-card' : 'border-border/50 bg-secondary/30 opacity-60'
                  }`}
                >
                  <span className="text-xl">{info.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{pref.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${info.color}`}>{pref.eventType}</span>
                    </div>
                    {pref.description && <p className="text-xs text-muted-foreground mt-0.5">{pref.description}</p>}
                  </div>
                  <button
                    onClick={() => toggleNotif(pref.eventType)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      pref.enabled
                        ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                        : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                    }`}
                  >
                    {pref.enabled ? <Bell size={12} /> : <BellOff size={12} />}
                    {pref.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {notifPrefs.length > 0 && (
          <button onClick={handleNotifSave} disabled={notifSaving} className="flex items-center gap-2 h-10 px-6 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {notifSaving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Save Notification Preferences
          </button>
        )}
      </div>
    </div>
  );
}
