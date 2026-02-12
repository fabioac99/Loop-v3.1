'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { ArrowLeft, Send, Paperclip, Eye, EyeOff, Copy, Clock, AlertTriangle, Loader2, MoreHorizontal } from 'lucide-react';

const statusColors: Record<string, string> = {
  OPEN: 'bg-blue-500/10 text-blue-500', IN_PROGRESS: 'bg-amber-500/10 text-amber-500',
  WAITING_REPLY: 'bg-purple-500/10 text-purple-500', APPROVED: 'bg-emerald-500/10 text-emerald-500',
  REJECTED: 'bg-red-500/10 text-red-500', CLOSED: 'bg-zinc-500/10 text-zinc-400',
};

export default function TicketDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const isAdmin = user?.globalRole === 'GLOBAL_ADMIN';
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const fetchTicket = async () => {
    try {
      const data = await api.getTicket(id as string);
      setTicket(data);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchTicket(); }, [id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    try {
      await api.addMessage(ticket.id, { content: message });
      setMessage('');
      fetchTicket();
    } finally { setSending(false); }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    try {
      await api.addNote(ticket.id, note);
      setNote('');
      fetchTicket();
    } catch {}
  };

  const handleStatusChange = async (status: string) => {
    await api.updateTicket(ticket.id, { status });
    fetchTicket();
  };

  const handleAction = async (action: string) => {
    await api.executeAction(ticket.id, action);
    fetchTicket();
    setShowActions(false);
  };

  const handleDuplicate = async () => {
    const dup = await api.duplicateTicket(ticket.id);
    router.push(`/dashboard/tickets/${dup.id}`);
  };

  const getSlaInfo = () => {
    if (!ticket?.slaResolutionDeadline || ['CLOSED', 'REJECTED'].includes(ticket.status)) return null;
    const deadline = new Date(ticket.slaResolutionDeadline);
    const now = new Date();
    const hours = (deadline.getTime() - now.getTime()) / 3600000;
    if (hours < 0) return { color: 'text-red-400 bg-red-500/10', text: `Overdue by ${Math.abs(Math.round(hours))}h`, icon: AlertTriangle };
    if (hours < 8) return { color: 'text-amber-400 bg-amber-500/10', text: `${Math.round(hours)}h remaining`, icon: Clock };
    return { color: 'text-emerald-400 bg-emerald-500/10', text: `${Math.round(hours)}h remaining`, icon: Clock };
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-primary" size={24} /></div>;
  if (!ticket) return <p className="text-center text-muted-foreground">Ticket not found</p>;

  const sla = getSlaInfo();
  const canManage = isAdmin || user?.departmentRole === 'DEPARTMENT_HEAD' || ticket.assignedToId === user?.id;
  const canSeeNotes = isAdmin || user?.departmentId === ticket.toDepartmentId;
  const actions = ticket.subtype?.actions || {};

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-accent mt-0.5"><ArrowLeft size={18} /></button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-mono text-sm text-muted-foreground">{ticket.ticketNumber}</span>
            <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${statusColors[ticket.status]}`}>{ticket.status.replace('_', ' ')}</span>
            {ticket.priority === 'URGENT' && <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-red-500/10 text-red-400 animate-pulse">URGENT</span>}
            {ticket.priority === 'HIGH' && <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-amber-500/10 text-amber-400">HIGH</span>}
            {sla && (
              <span className={`px-2 py-0.5 rounded-md text-xs font-medium flex items-center gap-1 ${sla.color}`}>
                <sla.icon size={10} /> {sla.text}
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold">{ticket.title}</h1>
        </div>

        {/* Status actions */}
        {canManage && (
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={ticket.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="h-9 px-3 rounded-lg bg-secondary border border-border text-sm"
            >
              {['OPEN', 'IN_PROGRESS', 'WAITING_REPLY', 'APPROVED', 'REJECTED', 'CLOSED'].map(s => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>

            {/* Operational Actions */}
            {Object.keys(actions).length > 0 && (
              <div className="relative">
                <button onClick={() => setShowActions(!showActions)} className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
                  Actions
                </button>
                {showActions && (
                  <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl z-10 py-1 min-w-[160px]">
                    {Object.entries(actions).map(([key, action]: any) => (
                      <button key={key} onClick={() => handleAction(key)} className="w-full px-3 py-2 text-sm text-left hover:bg-accent">
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button onClick={handleDuplicate} className="h-9 px-3 rounded-lg border border-border text-sm hover:bg-accent" title="Duplicate">
              <Copy size={14} />
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Description */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
          </div>

          {/* Form Data */}
          {ticket.formSubmission?.data && Object.keys(ticket.formSubmission.data).length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="text-sm font-semibold mb-3">Form Details</h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(ticket.formSubmission.data).map(([key, val]: any) => (
                  <div key={key}>
                    <p className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</p>
                    <p className="text-sm font-medium">{Array.isArray(val) ? val.join(', ') : String(val)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Messages / Conversation */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-semibold">Conversation ({ticket.messages?.length || 0})</h3>
              {canSeeNotes && (
                <button onClick={() => setShowNotes(!showNotes)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                  {showNotes ? <EyeOff size={12} /> : <Eye size={12} />}
                  {showNotes ? 'Hide' : 'Show'} internal notes
                </button>
              )}
            </div>

            <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
              {ticket.messages?.map((msg: any) => (
                <div key={msg.id} className={`p-4 ${msg.author.id === user?.id ? 'bg-primary/5' : ''}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                      {msg.author.firstName?.[0]}{msg.author.lastName?.[0]}
                    </div>
                    <span className="text-sm font-medium">{msg.author.firstName} {msg.author.lastName}</span>
                    <span className="text-xs text-muted-foreground">{new Date(msg.createdAt).toLocaleString()}</span>
                    {msg.isEdited && <span className="text-[10px] text-muted-foreground">(edited)</span>}
                  </div>
                  <p className="text-sm whitespace-pre-wrap pl-9">{msg.content}</p>
                  {msg.attachments?.length > 0 && (
                    <div className="pl-9 mt-2 flex flex-wrap gap-2">
                      {msg.attachments.map((att: any) => (
                        <a key={att.id} href={`${process.env.NEXT_PUBLIC_API_URL}/files/${att.id}`} target="_blank"
                          className="text-xs text-primary bg-primary/10 px-2 py-1 rounded-md hover:underline flex items-center gap-1">
                          <Paperclip size={10} /> {att.originalName}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {(!ticket.messages?.length) && (
                <p className="p-6 text-center text-sm text-muted-foreground">No messages yet</p>
              )}
            </div>

            {/* Reply */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-border">
              <div className="flex gap-2">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type a reply..."
                  className="flex-1 h-20 px-3 py-2 rounded-xl bg-secondary border border-border text-sm resize-none"
                />
                <button type="submit" disabled={sending || !message.trim()} className="self-end h-10 w-10 bg-primary text-primary-foreground rounded-xl flex items-center justify-center hover:opacity-90 disabled:opacity-50">
                  {sending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                </button>
              </div>
            </form>
          </div>

          {/* Internal Notes */}
          {showNotes && canSeeNotes && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-amber-500/20">
                <h3 className="text-sm font-semibold text-amber-400">Internal Notes (private to {ticket.toDepartment?.name})</h3>
              </div>
              <div className="divide-y divide-amber-500/10">
                {ticket.internalNotes?.map((n: any) => (
                  <div key={n.id} className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{n.author.firstName} {n.author.lastName}</span>
                      <span className="text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-sm">{n.content}</p>
                  </div>
                ))}
              </div>
              <form onSubmit={handleAddNote} className="p-4 border-t border-amber-500/20">
                <div className="flex gap-2">
                  <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add internal note..." className="flex-1 h-10 px-3 rounded-xl bg-secondary border border-border text-sm" />
                  <button type="submit" className="h-10 px-4 bg-amber-500 text-white rounded-xl text-sm font-medium hover:opacity-90">Add</button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Details */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-semibold">Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">From</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: ticket.fromDepartment?.color }} />{ticket.fromDepartment?.name}</span>
              </div>
              <div className="flex justify-between"><span className="text-muted-foreground">To</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: ticket.toDepartment?.color }} />{ticket.toDepartment?.name}</span>
              </div>
              <div className="flex justify-between"><span className="text-muted-foreground">Created by</span><span>{ticket.createdBy?.firstName} {ticket.createdBy?.lastName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Assigned to</span><span>{ticket.assignedTo ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}` : 'Unassigned'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Priority</span><span className="font-medium">{ticket.priority}</span></div>
              {ticket.subtype && <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span>{ticket.subtype.category?.name} / {ticket.subtype.name}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">Created</span><span>{new Date(ticket.createdAt).toLocaleDateString()}</span></div>
              {ticket.dueDate && <div className="flex justify-between"><span className="text-muted-foreground">Due</span><span>{new Date(ticket.dueDate).toLocaleDateString()}</span></div>}
              {ticket.tags?.length > 0 && (
                <div><span className="text-muted-foreground block mb-1">Tags</span>
                  <div className="flex flex-wrap gap-1">{ticket.tags.map((t: string) => <span key={t} className="px-2 py-0.5 bg-secondary rounded-md text-xs">{t}</span>)}</div>
                </div>
              )}
            </div>
          </div>

          {/* Watchers */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-sm font-semibold mb-3">Watchers ({ticket.watchers?.length || 0})</h3>
            <div className="flex flex-wrap gap-1">
              {ticket.watchers?.map((w: any) => (
                <span key={w.id} className="px-2 py-1 bg-secondary rounded-lg text-xs">{w.user.firstName} {w.user.lastName?.[0]}.</span>
              ))}
            </div>
          </div>

          {/* History */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-sm font-semibold mb-3">History</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {ticket.historyLogs?.map((log: any) => (
                <div key={log.id} className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{log.field}</span> changed
                  {log.oldValue && <> from <span className="font-mono">{log.oldValue}</span></>}
                  {log.newValue && <> to <span className="font-mono">{log.newValue}</span></>}
                  <p className="text-[10px] mt-0.5">{new Date(log.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
