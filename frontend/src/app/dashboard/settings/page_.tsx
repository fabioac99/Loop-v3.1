'use client';
import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import { Settings, Save, Loader2, Bell, BellOff, Upload, Image, X, Globe, Type, Sun, Moon } from 'lucide-react';

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

      {/* Branding */}
      <BrandingSection settings={settings} onUpdate={(updates: any) => setSettings({ ...settings, ...updates })} />

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
          <p className="text-sm text-muted-foreground text-center py-6">No notification preferences configured.</p>
        ) : (
          <div className="space-y-2">
            {notifPrefs.map((pref) => {
              const info = EVENT_TYPE_INFO[pref.eventType] || { icon: '🔔', color: 'bg-zinc-500/10 text-zinc-500' };
              return (
                <div key={pref.eventType} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${pref.enabled ? 'border-border bg-card' : 'border-border/50 bg-secondary/30 opacity-60'}`}>
                  <span className="text-xl">{info.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{pref.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${info.color}`}>{pref.eventType}</span>
                    </div>
                    {pref.description && <p className="text-xs text-muted-foreground mt-0.5">{pref.description}</p>}
                  </div>
                  <button onClick={() => toggleNotif(pref.eventType)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${pref.enabled ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'}`}>
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

/* ============================== BRANDING SECTION ============================== */
function BrandingSection({ settings, onUpdate }: { settings: any; onUpdate: (updates: any) => void }) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const logoLightInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File, settingKey: string) => {
    setUploading(settingKey);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${api.baseUrl}/files/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${api.getAccessToken()}` },
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      await api.updateSettings({ [settingKey]: data.id });
      onUpdate({ [settingKey]: data.id });
    } catch (err) {
      console.error('Upload failed:', err);
    } finally { setUploading(null); }
  };

  const handleRemove = async (settingKey: string) => {
    await api.updateSettings({ [settingKey]: '' });
    onUpdate({ [settingKey]: '' });
  };

  const handleSaveBrand = async () => {
    setSaving(true);
    try {
      await api.updateSettings({
        brandName: settings.brandName || '',
        showBrandName: settings.showBrandName ?? true,
        expandLogo: settings.expandLogo ?? false,
      });
    } finally { setSaving(false); }
  };

  const logoUrl = settings.logoFileId ? `${api.baseUrl}/files/${settings.logoFileId}` : null;
  const logoLightUrl = settings.logoLightFileId ? `${api.baseUrl}/files/${settings.logoLightFileId}` : null;
  const faviconUrl = settings.faviconFileId ? `${api.baseUrl}/files/${settings.faviconFileId}` : null;

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Image size={18} className="text-primary" />
        <div>
          <h2 className="text-sm font-semibold">Branding</h2>
          <p className="text-xs text-muted-foreground">Configure your platform logo, name, and appearance</p>
        </div>
      </div>

      {/* Brand Name Settings */}
      <div className="space-y-4 p-4 bg-secondary/30 rounded-xl border border-border/50">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Type size={14} /> Brand Name
        </h3>
        <div>
          <label className="block text-sm font-medium mb-1.5">Platform Name</label>
          <input type="text" placeholder="LOOP"
            className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm"
            value={settings.brandName || ''}
            onChange={e => onUpdate({ brandName: e.target.value })}
          />
          <p className="text-xs text-muted-foreground mt-1">Shown next to the logo in the sidebar</p>
        </div>

        {/* Show Brand Name Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium">Show Brand Name</span>
            <p className="text-xs text-muted-foreground">Display the text next to the logo</p>
          </div>
          <button onClick={() => onUpdate({ showBrandName: !(settings.showBrandName ?? true) })}
            className={`relative w-11 h-6 rounded-full transition-colors ${(settings.showBrandName ?? true) ? 'bg-primary' : 'bg-zinc-600'}`}>
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${(settings.showBrandName ?? true) ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
          </button>
        </div>

        {/* Expand Logo Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium">Expand Logo</span>
            <p className="text-xs text-muted-foreground">Make the logo larger when text is hidden</p>
          </div>
          <button onClick={() => onUpdate({ expandLogo: !settings.expandLogo })}
            className={`relative w-11 h-6 rounded-full transition-colors ${settings.expandLogo ? 'bg-primary' : 'bg-zinc-600'}`}>
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${settings.expandLogo ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
          </button>
        </div>

        <button onClick={handleSaveBrand} disabled={saving} className="flex items-center gap-2 h-9 px-5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
          {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Save Brand Settings
        </button>
      </div>

      {/* Preview */}
      <div className="p-4 bg-secondary/30 rounded-xl border border-border/50">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Preview</h3>
        <div className="flex gap-6">
          <div className="flex-1 bg-zinc-900 rounded-lg p-4 flex items-center gap-3 border border-zinc-700">
            <Moon size={10} className="text-zinc-500" />
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className={`object-contain shrink-0 rounded-lg ${settings.expandLogo && !(settings.showBrandName ?? true) ? 'h-10' : 'h-8 w-8'}`} />
            ) : (
              <div className={`rounded-lg bg-primary/10 flex items-center justify-center shrink-0 ${settings.expandLogo && !(settings.showBrandName ?? true) ? 'w-10 h-10' : 'w-8 h-8'}`}>
                <div className="w-4 h-4 rounded-full border-[2.5px] border-primary" />
              </div>
            )}
            {(settings.showBrandName ?? true) && <span className="font-bold text-lg tracking-tight text-white">{settings.brandName || 'LOOP'}</span>}
          </div>
          <div className="flex-1 bg-white rounded-lg p-4 flex items-center gap-3 border border-zinc-200">
            <Sun size={10} className="text-zinc-400" />
            {(logoLightUrl || logoUrl) ? (
              <img src={logoLightUrl || logoUrl!} alt="Logo" className={`object-contain shrink-0 rounded-lg ${settings.expandLogo && !(settings.showBrandName ?? true) ? 'h-10' : 'h-8 w-8'}`} />
            ) : (
              <div className={`rounded-lg bg-indigo-100 flex items-center justify-center shrink-0 ${settings.expandLogo && !(settings.showBrandName ?? true) ? 'w-10 h-10' : 'w-8 h-8'}`}>
                <div className="w-4 h-4 rounded-full border-[2.5px] border-indigo-500" />
              </div>
            )}
            {(settings.showBrandName ?? true) && <span className="font-bold text-lg tracking-tight text-zinc-900">{settings.brandName || 'LOOP'}</span>}
          </div>
        </div>
      </div>

      {/* Logo Uploads */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {[
          { label: 'Dark Mode Logo', icon: Moon, key: 'logoFileId', ref: logoInputRef, url: logoUrl, bg: 'bg-zinc-900' },
          { label: 'Light Mode Logo', icon: Sun, key: 'logoLightFileId', ref: logoLightInputRef, url: logoLightUrl, bg: 'bg-white border-zinc-300' },
          { label: 'Favicon', icon: Globe, key: 'faviconFileId', ref: faviconInputRef, url: faviconUrl, bg: 'bg-secondary/50' },
        ].map(item => (
          <div key={item.key} className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium"><item.icon size={14} /> {item.label}</label>
            <div className="flex flex-col items-center gap-3">
              <div className={`w-24 h-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden ${item.bg}`}>
                {item.url ? (
                  <img src={item.url} alt={item.label} className="w-full h-full object-contain p-2" />
                ) : (
                  <Image size={24} className="text-muted-foreground/40" />
                )}
              </div>
              <input ref={item.ref} type="file" accept="image/*,.ico" className="hidden"
                onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], item.key)} />
              <button onClick={() => item.ref.current?.click()} disabled={uploading === item.key}
                className="flex items-center gap-2 px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs font-medium hover:bg-accent transition-all disabled:opacity-50 w-full justify-center">
                {uploading === item.key ? <Loader2 className="animate-spin" size={12} /> : <Upload size={12} />} Upload
              </button>
              {item.url && (
                <button onClick={() => handleRemove(item.key)} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300">
                  <X size={12} /> Remove
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
