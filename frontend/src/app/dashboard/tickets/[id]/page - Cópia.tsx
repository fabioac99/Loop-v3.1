'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { getApiUrl } from '@/lib/config';
import { useAuthStore } from '@/stores/auth';
import { useNotificationStore } from '@/stores/notifications';
import {
  ArrowLeft, Send, Paperclip, Eye, EyeOff, Copy, Clock, AlertTriangle,
  Loader2, Image as ImageIcon, Bold, Italic, List, X, Bell, BellOff, UserPlus,
} from 'lucide-react';
import RichTextEditor from '@/components/common/RichTextEditor';
import type { UploadedFile } from '@/components/common/RichTextEditor';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-zinc-500/10 text-zinc-500',
  OPEN: 'bg-blue-500/10 text-blue-500', IN_PROGRESS: 'bg-amber-500/10 text-amber-500',
  WAITING_REPLY: 'bg-purple-500/10 text-purple-500', APPROVED: 'bg-emerald-500/10 text-emerald-500',
  REJECTED: 'bg-red-500/10 text-red-500', CLOSED: 'bg-zinc-500/10 text-zinc-400',
};

/* ============================== WATCHERS / CC WIDGET ============================== */
function WatchersWidget({ ticket, onUpdate }: { ticket: any; onUpdate: () => void }) {
  const { user } = useAuthStore();
  const [showAdd, setShowAdd] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentWatcherIds = new Set((ticket.watchers || []).map((w: any) => w.user?.id || w.userId));
  const isMeWatching = currentWatcherIds.has(user?.id);

  useEffect(() => {
    if (showAdd) {
      api.getUsers().then((r) => setUsers(r.data || []));
    }
  }, [showAdd]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowAdd(false);
    };
    if (showAdd) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAdd]);

  const addWatcher = async (userId: string) => {
    setLoading(true);
    try {
      await api.addWatcher(ticket.id, userId);
      onUpdate();
    } catch {} finally { setLoading(false); }
  };

  const removeWatcher = async (userId: string) => {
    setLoading(true);
    try {
      await api.removeWatcher(ticket.id, userId);
      onUpdate();
    } catch {} finally { setLoading(false); }
  };

  const toggleSelfWatch = async () => {
    if (isMeWatching) {
      await removeWatcher(user!.id);
    } else {
      await addWatcher(user!.id);
    }
  };

  const filteredUsers = users.filter(
    (u) => !currentWatcherIds.has(u.id) &&
      (`${u.firstName} ${u.lastName} ${u.email}`).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          CC / Watchers ({ticket.watchers?.length || 0})
        </h3>
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1 text-[11px] text-primary hover:underline"
          >
            <UserPlus size={12} /> Add
          </button>

          {/* Add watcher dropdown */}
          {showAdd && (
            <div className="absolute right-0 top-full mt-1 w-64 bg-card border border-border rounded-xl shadow-xl z-20 overflow-hidden">
              <div className="p-2">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search users..."
                  className="w-full h-8 px-3 rounded-lg bg-secondary border border-border text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  autoFocus
                />
              </div>
              <div className="max-h-48 overflow-y-auto">
                {filteredUsers.length === 0 ? (
                  <p className="px-3 py-4 text-xs text-muted-foreground text-center">No users available</p>
                ) : (
                  filteredUsers.slice(0, 15).map((u) => (
                    <button
                      key={u.id}
                      onClick={() => { addWatcher(u.id); setShowAdd(false); setSearch(''); }}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent text-left transition-colors"
                    >
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary shrink-0">
                        {u.firstName?.[0]}{u.lastName?.[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{u.firstName} {u.lastName}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{u.department?.name || 'No dept'}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Watcher list */}
      <div className="space-y-1.5">
        {(ticket.watchers || []).map((w: any) => {
          const wUser = w.user;
          const isMe = wUser?.id === user?.id;
          return (
            <div key={w.id} className="flex items-center gap-2 group">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary shrink-0">
                {wUser?.firstName?.[0]}{wUser?.lastName?.[0]}
              </div>
              <span className="text-xs flex-1 truncate">
                {wUser?.firstName} {wUser?.lastName}
                {isMe && <span className="text-muted-foreground"> (you)</span>}
              </span>
              <button
                onClick={() => removeWatcher(wUser?.id)}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all"
                title="Remove watcher"
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Quick self-watch toggle */}
      <button
        onClick={toggleSelfWatch}
        className={`mt-3 w-full flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-medium transition-all
          ${isMeWatching
            ? 'bg-secondary text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
            : 'bg-primary/10 text-primary hover:bg-primary/20'
          }`}
      >
        {isMeWatching ? (
          <><EyeOff size={12} /> Stop watching</>
        ) : (
          <><Eye size={12} /> Watch this ticket</>
        )}
      </button>
    </div>
  );
}

/* ============================== TICKET DETAIL ============================== */

export default function TicketDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const { unreadTicketIds, markTicketRead, markTicketUnread, fetchUnreadTicketIds, fetchNotifications } = useNotificationStore();
  const isAdmin = user?.globalRole === 'GLOBAL_ADMIN';
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageFiles, setMessageFiles] = useState<UploadedFile[]>([]);
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

  // Auto-mark notifications as read when opening the ticket
  useEffect(() => {
    if (id && unreadTicketIds.includes(id as string)) {
      markTicketRead(id as string).then(() => {
        fetchNotifications();
        fetchUnreadTicketIds();
      });
    }
  }, [id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && messageFiles.length === 0) return;
    setSending(true);
    try {
      await api.addMessage(ticket.id, {
        content: message,
        attachmentIds: messageFiles.map(f => f.id),
      });
      setMessage('');
      setMessageFiles([]);
      fetchTicket();
    } finally { setSending(false); }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    try { await api.addNote(ticket.id, note); setNote(''); fetchTicket(); } catch {}
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
    const hours = (deadline.getTime() - Date.now()) / 3600000;
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
  const apiUrl = getApiUrl();

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
            {sla && <span className={`px-2 py-0.5 rounded-md text-xs font-medium flex items-center gap-1 ${sla.color}`}><sla.icon size={10} /> {sla.text}</span>}
          </div>
          <h1 className="text-xl font-bold">{ticket.title}</h1>
        </div>
        {canManage && (
          <div className="flex items-center gap-2 shrink-0">
            <select value={ticket.status} onChange={(e) => handleStatusChange(e.target.value)} className="h-9 px-3 rounded-lg bg-secondary border border-border text-sm">
              {['DRAFT', 'OPEN', 'IN_PROGRESS', 'WAITING_REPLY', 'APPROVED', 'REJECTED', 'CLOSED'].map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
            {Object.keys(actions).length > 0 && (
              <div className="relative">
                <button onClick={() => setShowActions(!showActions)} className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">Actions</button>
                {showActions && (
                  <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl z-10 py-1 min-w-[160px]">
                    {Object.entries(actions).map(([key, action]: any) => (
                      <button key={key} onClick={() => handleAction(key)} className="w-full px-3 py-2 text-sm text-left hover:bg-accent">{action.label}</button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <button onClick={handleDuplicate} className="h-9 px-3 rounded-lg border border-border text-sm hover:bg-accent" title="Duplicate"><Copy size={14} /></button>
            <button
              onClick={async () => {
                await markTicketUnread(ticket.id);
                fetchNotifications();
                fetchUnreadTicketIds();
              }}
              className="h-9 px-3 rounded-lg border border-border text-sm hover:bg-accent flex items-center gap-1.5"
              title="Mark as unread"
            >
              <BellOff size={14} />
              <span className="hidden sm:inline text-xs">Unread</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Description */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Description</h3>
            <div className="text-sm prose prose-sm prose-invert max-w-none [&_img]:rounded-lg [&_img]:max-w-full" dangerouslySetInnerHTML={{ __html: ticket.description }} />
          </div>

          {/* Ticket Attachments */}
          {ticket.attachments?.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Attachments ({ticket.attachments.length})</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ticket.attachments.map((att: any) => (
                  <a key={att.id} href={`${apiUrl}/files/${att.id}`} target="_blank" rel="noopener noreferrer"
                    className="border border-border rounded-xl p-3 hover:bg-accent/50 transition-all group">
                    {att.mimeType?.startsWith('image/') ? (
                      <img src={`${apiUrl}/files/${att.id}`} alt={att.originalName} className="w-full h-24 object-cover rounded-lg mb-2" />
                    ) : (
                      <div className="w-full h-24 bg-secondary rounded-lg flex items-center justify-center mb-2">
                        <Paperclip size={24} className="text-muted-foreground" />
                      </div>
                    )}
                    <p className="text-xs font-medium truncate">{att.originalName}</p>
                    <p className="text-[10px] text-muted-foreground">{(att.size / 1024).toFixed(1)} KB</p>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Form Data */}
          {/* Entity info (Client/Supplier) from ticket.metadata */}
          {ticket.metadata?.entityType && ticket.metadata.entityType !== 'none' && (
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
              ticket.metadata.entityType === 'client'
                ? 'bg-blue-500/5 border-blue-500/20'
                : 'bg-emerald-500/5 border-emerald-500/20'
            }`}>
              <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${
                ticket.metadata.entityType === 'client'
                  ? 'bg-blue-500/10 text-blue-500'
                  : 'bg-emerald-500/10 text-emerald-500'
              }`}>{ticket.metadata.entityType}</span>
              <span className="text-sm font-medium">{ticket.metadata.entityName || '—'}</span>
            </div>
          )}

          {ticket.formSubmission?.data && Object.keys(ticket.formSubmission.data).length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Form Details</h3>
              <div className="space-y-3">
                {/* Regular fields */}
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(ticket.formSubmission.data)
                    .filter(([k, v]) => !k.endsWith('_files') && !k.startsWith('_entity') && !Array.isArray(v))
                    .map(([key, val]: any) => (
                    <div key={key} className="bg-secondary/50 rounded-lg px-3 py-2">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{key.replace(/_/g, ' ')}</p>
                      <p className="text-sm font-medium mt-0.5">{String(val || '-')}</p>
                    </div>
                  ))}
                </div>
                {/* Table/Repeater fields (arrays of objects) */}
                {Object.entries(ticket.formSubmission.data)
                  .filter(([k, v]) => !k.endsWith('_files') && Array.isArray(v) && v.length > 0 && typeof v[0] === 'object')
                  .map(([key, rows]: any) => {
                    const colKeys = Object.keys(rows[0] || {});
                    return (
                      <div key={key}>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">{key.replace(/_/g, ' ')}</p>
                        <div className="border border-border rounded-lg overflow-hidden">
                          <div className="grid bg-accent/50" style={{ gridTemplateColumns: `repeat(${colKeys.length}, 1fr)` }}>
                            {colKeys.map(ck => (
                              <div key={ck} className="px-3 py-2 text-[10px] font-semibold border-r border-border last:border-r-0">{ck.replace(/_/g, ' ')}</div>
                            ))}
                          </div>
                          {rows.map((row: any, ri: number) => (
                            <div key={ri} className="grid border-t border-border" style={{ gridTemplateColumns: `repeat(${colKeys.length}, 1fr)` }}>
                              {colKeys.map(ck => (
                                <div key={ck} className="px-3 py-2 text-xs border-r border-border last:border-r-0">{String(row[ck] ?? '-')}</div>
                              ))}
                            </div>
                          ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">{rows.length} row{rows.length !== 1 ? 's' : ''}</p>
                      </div>
                    );
                  })
                }
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
                <div key={msg.id} className={`p-4 ${msg.author.id === user?.id ? 'bg-primary/[0.03]' : ''}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                      {msg.author.firstName?.[0]}{msg.author.lastName?.[0]}
                    </div>
                    <span className="text-sm font-medium">{msg.author.firstName} {msg.author.lastName}</span>
                    <span className="text-xs text-muted-foreground">{new Date(msg.createdAt).toLocaleString()}</span>
                    {msg.isEdited && <span className="text-[10px] text-muted-foreground italic">(edited)</span>}
                  </div>
                  <div className="pl-9 text-sm prose prose-sm prose-invert max-w-none [&_img]:rounded-lg [&_img]:max-w-full [&_img]:max-h-[300px]" dangerouslySetInnerHTML={{ __html: msg.content }} />

                  {/* Message attachments */}
                  {msg.attachments?.length > 0 && (
                    <div className="pl-9 mt-3 flex flex-wrap gap-2">
                      {msg.attachments.map((att: any) => (
                        <a key={att.id} href={`${apiUrl}/files/${att.id}`} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 bg-secondary border border-border rounded-lg px-3 py-2 text-xs hover:bg-accent transition-all">
                          {att.mimeType?.startsWith('image/') ? (
                            <img src={`${apiUrl}/files/${att.id}`} alt={att.originalName} className="w-8 h-8 rounded object-cover" />
                          ) : (
                            <Paperclip size={14} className="text-muted-foreground" />
                          )}
                          <div>
                            <p className="font-medium truncate max-w-[120px]">{att.originalName}</p>
                            <p className="text-muted-foreground">{(att.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {(!ticket.messages?.length) && (
                <p className="p-6 text-center text-sm text-muted-foreground">No messages yet — be the first to reply</p>
              )}
            </div>

            {/* Reply area with Rich Text Editor */}
            <div className="border-t border-border p-4">
              <form onSubmit={handleSendMessage}>
                <RichTextEditor
                  value={message}
                  onChange={setMessage}
                  placeholder="Write a reply... Paste images directly or use the toolbar to attach files."
                  minHeight="100px"
                  ticketId={ticket.id}
                  onFilesChange={setMessageFiles}
                />
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-muted-foreground">
                    {messageFiles.length > 0 && `${messageFiles.length} file(s) attached`}
                  </p>
                  <button type="submit" disabled={sending || (!message.trim() && messageFiles.length === 0)}
                    className="flex items-center gap-2 h-9 px-5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-all">
                    {sending ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
                    Reply
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Internal Notes */}
          {showNotes && canSeeNotes && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-amber-500/20">
                <h3 className="text-sm font-semibold text-amber-400">Internal Notes — visible only to {ticket.toDepartment?.name}</h3>
              </div>
              <div className="divide-y divide-amber-500/10 max-h-[300px] overflow-y-auto">
                {ticket.internalNotes?.length > 0 ? ticket.internalNotes.map((n: any) => (
                  <div key={n.id} className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{n.author.firstName} {n.author.lastName}</span>
                      <span className="text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{n.content}</p>
                  </div>
                )) : <p className="p-4 text-sm text-muted-foreground">No internal notes yet</p>}
              </div>
              <form onSubmit={handleAddNote} className="p-4 border-t border-amber-500/20 flex gap-2">
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add internal note..." className="flex-1 h-10 px-3 rounded-xl bg-secondary border border-border text-sm" />
                <button type="submit" disabled={!note.trim()} className="h-10 px-4 bg-amber-500 text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-40">Add</button>
              </form>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Details</h3>
            <div className="space-y-3 text-sm">
              {[
                ['From', <span key="f" className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: ticket.fromDepartment?.color }} />{ticket.fromDepartment?.name}</span>],
                ['To', <span key="t" className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: ticket.toDepartment?.color }} />{ticket.toDepartment?.name}</span>],
                ['Created by', `${ticket.createdBy?.firstName} ${ticket.createdBy?.lastName}`],
                ['Assigned to', ticket.assignedTo ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}` : 'Unassigned'],
                ['Priority', ticket.priority],
                ...(ticket.subtype ? [['Type', `${ticket.subtype.category?.name} / ${ticket.subtype.name}`]] : []),
                ['Created', new Date(ticket.createdAt).toLocaleDateString()],
                ...(ticket.dueDate ? [['Due', new Date(ticket.dueDate).toLocaleDateString()]] : []),
              ].map(([label, val], i) => (
                <div key={i} className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className="text-right">{val}</span></div>
              ))}
              {ticket.tags?.length > 0 && (
                <div><span className="text-muted-foreground block mb-1">Tags</span>
                  <div className="flex flex-wrap gap-1">{ticket.tags.map((t: string) => <span key={t} className="px-2 py-0.5 bg-secondary rounded-md text-xs">{t}</span>)}</div>
                </div>
              )}
            </div>
          </div>

          <WatchersWidget ticket={ticket} onUpdate={fetchTicket} />

          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">History</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {ticket.historyLogs?.map((log: any) => (
                <div key={log.id} className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{log.field}</span> changed
                  {log.oldValue && <> from <code className="text-[10px] bg-secondary px-1 rounded">{log.oldValue}</code></>}
                  {log.newValue && <> to <code className="text-[10px] bg-secondary px-1 rounded">{log.newValue}</code></>}
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
