import { create } from 'zustand';
import { api } from '@/lib/api';

function sendBrowserNotification(title: string, body: string, ticketId?: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    const notif = new Notification(title, { body, icon: '/favicon.ico', tag: ticketId || 'loop-notification' });
    if (ticketId) notif.onclick = () => { window.focus(); window.location.href = `/dashboard/tickets/${ticketId}`; };
  }
}

export function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'default') Notification.requestPermission();
}

interface NotificationState {
  notifications: any[];
  unreadCount: number;
  unreadTicketIds: string[];
  isLoading: boolean;
  previousUnreadCount: number;
  fetchNotifications: () => Promise<void>;
  fetchUnreadTicketIds: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAsUnread: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  markTicketRead: (ticketId: string) => Promise<void>;
  markTicketUnread: (ticketId: string) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  unreadTicketIds: [],
  isLoading: false,
  previousUnreadCount: 0,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const data = await api.getNotifications();
      const prevCount = get().unreadCount;
      const newCount = data.unreadCount;
      if (newCount > prevCount && prevCount > 0) {
        const newNotifs = data.data.filter((n: any) => !n.isRead).slice(0, newCount - prevCount);
        for (const n of newNotifs) {
          sendBrowserNotification(n.title || 'New Notification', n.message || '', n.metadata?.ticketId);
        }
      }
      set({ notifications: data.data, unreadCount: newCount, previousUnreadCount: prevCount, isLoading: false });
    } catch { set({ isLoading: false }); }
  },

  fetchUnreadTicketIds: async () => {
    try {
      const ids = await api.getUnreadTicketIds();
      set({ unreadTicketIds: Array.isArray(ids) ? ids : [] });
    } catch { set({ unreadTicketIds: [] }); }
  },

  markAsRead: async (id: string) => {
    try {
      await api.markNotificationRead(id);
      set((s) => ({ notifications: s.notifications.map((n) => n.id === id ? { ...n, isRead: true } : n), unreadCount: Math.max(0, s.unreadCount - 1) }));
      get().fetchUnreadTicketIds();
    } catch {}
  },

  markAsUnread: async (id: string) => {
    try {
      await api.markNotificationUnread(id);
      set((s) => ({ notifications: s.notifications.map((n) => n.id === id ? { ...n, isRead: false } : n), unreadCount: s.unreadCount + 1 }));
      get().fetchUnreadTicketIds();
    } catch {}
  },

  markAllAsRead: async () => {
    try {
      await api.markAllNotificationsRead();
      set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, isRead: true })), unreadCount: 0, unreadTicketIds: [] }));
    } catch {}
  },

  markTicketRead: async (ticketId: string) => {
    try {
      await api.markTicketNotificationsRead(ticketId);
      set((s) => {
        const updated = s.notifications.map((n) => (n.data?.ticketId === ticketId && !n.isRead) ? { ...n, isRead: true } : n);
        return { unreadTicketIds: s.unreadTicketIds.filter((id) => id !== ticketId), notifications: updated, unreadCount: updated.filter((n) => !n.isRead).length };
      });
    } catch {}
  },

  markTicketUnread: async (ticketId: string) => {
    try {
      await api.markTicketNotificationsUnread(ticketId);
      set((s) => {
        const updated = s.notifications.map((n) => (n.data?.ticketId === ticketId && n.isRead) ? { ...n, isRead: false } : n);
        return { unreadTicketIds: s.unreadTicketIds.includes(ticketId) ? s.unreadTicketIds : [...s.unreadTicketIds, ticketId], notifications: updated, unreadCount: updated.filter((n) => !n.isRead).length };
      });
    } catch {}
  },
}));
