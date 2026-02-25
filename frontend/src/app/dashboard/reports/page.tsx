'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import {
    FileText, Loader2, Mail, Monitor, Play, X, Settings2, Clock,
    AlertTriangle, BarChart3, Users, Calendar, CheckCircle2, XCircle,
    ChevronDown, Eye,
} from 'lucide-react';

const reportIcons: Record<string, any> = {
    daily_summary: Calendar,
    weekly_summary: BarChart3,
    overdue_alert: AlertTriangle,
    agent_performance: Users,
    sla_breach: Clock,
};

const reportColors: Record<string, string> = {
    daily_summary: 'text-blue-400 bg-blue-500/10',
    weekly_summary: 'text-indigo-400 bg-indigo-500/10',
    overdue_alert: 'text-red-400 bg-red-500/10',
    agent_performance: 'text-emerald-400 bg-emerald-500/10',
    sla_breach: 'text-amber-400 bg-amber-500/10',
};

export default function ReportsPage() {
    const { user, hasPermission } = useAuthStore();
    const isAdmin = user?.globalRole === 'GLOBAL_ADMIN' || user?.departmentRole === 'DEPARTMENT_HEAD';
    const [configs, setConfigs] = useState<any[]>([]);
    const [snapshots, setSnapshots] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState<string | null>(null);
    const [selectedSnapshot, setSelectedSnapshot] = useState<any>(null);
    const [snapshotHtml, setSnapshotHtml] = useState('');
    const [loadingSnapshot, setLoadingSnapshot] = useState(false);
    const [showConfig, setShowConfig] = useState(false);
    const [filterType, setFilterType] = useState('');
    const [savingConfig, setSavingConfig] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [c, s] = await Promise.all([
                api.getReportConfigs(),
                api.getReportSnapshots(filterType || undefined),
            ]);
            setConfigs(c);
            setSnapshots(s);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, [filterType]);

    const handleGenerate = async (reportType: string) => {
        setGenerating(reportType);
        try {
            const result = await api.generateReport(reportType);
            if (result.sent) {
                fetchData(); // Refresh snapshots
            } else {
                alert(result.error || 'Failed to generate report');
            }
        } catch (e: any) { alert(e.message); }
        setGenerating(null);
    };

    const openSnapshot = async (snap: any) => {
        setSelectedSnapshot(snap);
        setLoadingSnapshot(true);
        try {
            const full = await api.getReportSnapshot(snap.id);
            setSnapshotHtml(full.htmlContent);
        } catch (e) { setSnapshotHtml('<p>Failed to load report.</p>'); }
        setLoadingSnapshot(false);
    };

    const handleConfigToggle = async (configId: string, field: string, value: boolean) => {
        setSavingConfig(configId);
        try {
            await api.updateReportConfig(configId, { [field]: value });
            setConfigs(prev => prev.map(c => c.id === configId ? { ...c, [field]: value } : c));
        } catch (e: any) { alert(e.message); }
        setSavingConfig(null);
    };

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={24} /></div>;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <FileText size={24} className="text-primary" />
                    <div>
                        <h1 className="text-2xl font-bold">Reports</h1>
                        <p className="text-sm text-muted-foreground">View generated reports and manage report settings</p>
                    </div>
                </div>
                {isAdmin && (
                    <button onClick={() => setShowConfig(!showConfig)}
                        className={`flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-medium border transition-all ${showConfig ? 'border-primary text-primary bg-primary/5' : 'border-border text-muted-foreground hover:text-foreground'}`}>
                        <Settings2 size={14} /> Manage Reports
                    </button>
                )}
            </div>

            {/* Admin Config Panel */}
            {showConfig && isAdmin && (
                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                    <div className="p-5 border-b border-border bg-secondary/30">
                        <h2 className="text-sm font-semibold">Report Configuration</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">Enable/disable reports and choose delivery method</p>
                    </div>
                    <div className="divide-y divide-border">
                        {configs.map((config) => {
                            const Icon = reportIcons[config.reportType] || FileText;
                            const colorClass = reportColors[config.reportType] || 'text-zinc-400 bg-zinc-500/10';
                            return (
                                <div key={config.id} className="flex items-center gap-4 p-4 hover:bg-accent/30">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClass}`}>
                                        <Icon size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold">{config.name}</p>
                                        <p className="text-xs text-muted-foreground">{config.description}</p>
                                        {config.schedule && <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">Schedule: {config.schedule}</p>}
                                        {config.lastRunAt && <p className="text-[10px] text-muted-foreground">Last run: {new Date(config.lastRunAt).toLocaleString()}</p>}
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        {/* Enabled toggle */}
                                        <div className="flex flex-col items-center gap-1">
                                            <button onClick={() => handleConfigToggle(config.id, 'isEnabled', !config.isEnabled)}
                                                className={`relative w-10 h-5 rounded-full transition-colors ${config.isEnabled ? 'bg-primary' : 'bg-zinc-600'}`}
                                                disabled={savingConfig === config.id}>
                                                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${config.isEnabled ? 'left-[22px]' : 'left-0.5'}`} />
                                            </button>
                                            <span className="text-[9px] text-muted-foreground">{config.isEnabled ? 'Enabled' : 'Disabled'}</span>
                                        </div>
                                        {/* App delivery toggle */}
                                        <div className="flex flex-col items-center gap-1">
                                            <button onClick={() => handleConfigToggle(config.id, 'deliveryApp', !config.deliveryApp)}
                                                className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all ${config.deliveryApp ? 'border-primary text-primary bg-primary/5' : 'border-border text-muted-foreground hover:text-foreground'}`}
                                                disabled={savingConfig === config.id} title="Show in app">
                                                <Monitor size={14} />
                                            </button>
                                            <span className="text-[9px] text-muted-foreground">App</span>
                                        </div>
                                        {/* Email delivery toggle */}
                                        <div className="flex flex-col items-center gap-1">
                                            <button onClick={() => handleConfigToggle(config.id, 'deliveryEmail', !config.deliveryEmail)}
                                                className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all ${config.deliveryEmail ? 'border-primary text-primary bg-primary/5' : 'border-border text-muted-foreground hover:text-foreground'}`}
                                                disabled={savingConfig === config.id} title="Send via email">
                                                <Mail size={14} />
                                            </button>
                                            <span className="text-[9px] text-muted-foreground">Email</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Generate Reports */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-border">
                    <h2 className="text-sm font-semibold">Generate Report</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Generate a report now and view it instantly</p>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 p-4">
                    {configs.filter(c => c.isEnabled).map(config => {
                        const Icon = reportIcons[config.reportType] || FileText;
                        const colorClass = reportColors[config.reportType] || 'text-zinc-400 bg-zinc-500/10';
                        const isGenerating = generating === config.reportType;
                        return (
                            <button key={config.id} onClick={() => handleGenerate(config.reportType)} disabled={!!generating}
                                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:bg-accent/50 hover:border-primary/30 transition-all disabled:opacity-40 group">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClass} group-hover:scale-110 transition-transform`}>
                                    {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Icon size={18} />}
                                </div>
                                <span className="text-xs font-medium text-center">{config.name}</span>
                                <div className="flex gap-1">
                                    {config.deliveryApp && <Monitor size={10} className="text-muted-foreground" />}
                                    {config.deliveryEmail && <Mail size={10} className="text-muted-foreground" />}
                                </div>
                            </button>
                        );
                    })}
                    {configs.filter(c => c.isEnabled).length === 0 && (
                        <div className="col-span-full text-center py-6 text-muted-foreground text-sm">No reports enabled. {isAdmin ? 'Click "Manage Reports" to enable them.' : 'Ask an admin to enable reports.'}</div>
                    )}
                </div>
            </div>

            {/* Report History */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-border flex items-center justify-between">
                    <div>
                        <h2 className="text-sm font-semibold">Report History</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">Previously generated reports</p>
                    </div>
                    <select value={filterType} onChange={e => setFilterType(e.target.value)}
                        className="h-8 px-3 rounded-lg bg-secondary border border-border text-xs">
                        <option value="">All Types</option>
                        {configs.map(c => <option key={c.reportType} value={c.reportType}>{c.name}</option>)}
                    </select>
                </div>
                {snapshots.length === 0 ? (
                    <div className="p-12 text-center">
                        <FileText size={32} className="mx-auto text-muted-foreground mb-3" />
                        <p className="text-sm text-muted-foreground">No reports generated yet. Click a report above to generate one.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {snapshots.map(snap => {
                            const Icon = reportIcons[snap.reportType] || FileText;
                            const colorClass = reportColors[snap.reportType] || 'text-zinc-400 bg-zinc-500/10';
                            const config = configs.find(c => c.reportType === snap.reportType);
                            return (
                                <button key={snap.id} onClick={() => openSnapshot(snap)}
                                    className="w-full text-left flex items-center gap-4 p-4 hover:bg-accent/50 transition-all group">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
                                        <Icon size={16} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{snap.title}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{config?.name || snap.reportType}</span>
                                            <span className="text-[10px] text-muted-foreground">{new Date(snap.createdAt).toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <Eye size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Report Viewer Modal */}
            {selectedSnapshot && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => { setSelectedSnapshot(null); setSnapshotHtml(''); }}>
                    <div className="bg-card border border-border rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
                            <div>
                                <h3 className="font-semibold text-sm">{selectedSnapshot.title}</h3>
                                <p className="text-[10px] text-muted-foreground">{new Date(selectedSnapshot.createdAt).toLocaleString()}</p>
                            </div>
                            <button onClick={() => { setSelectedSnapshot(null); setSnapshotHtml(''); }} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground"><X size={16} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {loadingSnapshot ? (
                                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={24} /></div>
                            ) : (
                                <div className="p-1">
                                    <iframe
                                        srcDoc={snapshotHtml}
                                        className="w-full border-0 rounded-lg"
                                        style={{ minHeight: '600px' }}
                                        sandbox="allow-same-origin"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}