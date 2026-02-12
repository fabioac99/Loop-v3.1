'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { useNotificationStore } from '@/stores/notifications';
import { Bell, Check, CheckCheck } from 'lucide-react';

export default function NotificationsPage() {
  const { notifications, fetchNotifications, markAsRead, markAllAsRead, unreadCount } = useNotificationStore();
  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {unreadCount > 0 && (
          <button onClick={markAllAsRead} className="flex items-center gap-2 text-sm text-primary hover:underline"><CheckCheck size={14} /> Mark all read</button>
        )}
      </div>
      <div className="bg-card border border-border rounded-2xl divide-y divide-border">
        {notifications.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">No notifications</p>
        ) : notifications.map(n => (
          <div key={n.id} className={`p-4 flex items-start gap-3 ${!n.isRead ? 'bg-primary/5' : ''}`}>
            <Bell size={16} className={`mt-0.5 ${!n.isRead ? 'text-primary' : 'text-muted-foreground'}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{n.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{n.content}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[10px] text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</span>
                {n.data?.ticketId && <Link href={`/dashboard/tickets/${n.data.ticketId}`} className="text-[10px] text-primary hover:underline">View ticket</Link>}
              </div>
            </div>
            {!n.isRead && (
              <button onClick={() => markAsRead(n.id)} className="p-1 text-muted-foreground hover:text-primary"><Check size={14} /></button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
