import { create } from 'zustand';
import { api } from '@/lib/api';

interface NotificationState {
  notifications: any[];
  unreadCount: number;
  unreadTicketIds: Set<string>;
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  fetchUnreadTicketIds: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAsUnread: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  markTicketRead: (ticketId: string) => Promise<void>;
  markTicketUnread: (ticketId: string) => Promise<void>;
  hasUnreadForTicket: (ticketId: string) => boolean;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  unreadTicketIds: new Set<string>(),
  isLoading: false,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const data = await api.getNotifications();
      set({ notifications: data.data, unreadCount: data.unreadCount, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchUnreadTicketIds: async () => {
    try {
      const ids = await api.getUnreadTicketIds();
      set({ unreadTicketIds: new Set(ids) });
    } catch {}
  },

  markAsRead: async (id: string) => {
    await api.markNotificationRead(id);
    set((s) => ({
      notifications: s.notifications.map((n) => n.id === id ? { ...n, isRead: true } : n),
      unreadCount: Math.max(0, s.unreadCount - 1),
    }));
    // Refresh unread ticket IDs
    get().fetchUnreadTicketIds();
  },

  markAsUnread: async (id: string) => {
    await api.markNotificationUnread(id);
    set((s) => ({
      notifications: s.notifications.map((n) => n.id === id ? { ...n, isRead: false } : n),
      unreadCount: s.unreadCount + 1,
    }));
    get().fetchUnreadTicketIds();
  },

  markAllAsRead: async () => {
    await api.markAllNotificationsRead();
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
      unreadTicketIds: new Set<string>(),
    }));
  },

  markTicketRead: async (ticketId: string) => {
    await api.markTicketNotificationsRead(ticketId);
    set((s) => {
      const newSet = new Set(s.unreadTicketIds);
      newSet.delete(ticketId);
      // Update notification list items for this ticket
      const updated = s.notifications.map((n) =>
        (n.data?.ticketId === ticketId && !n.isRead) ? { ...n, isRead: true } : n
      );
      const newUnread = updated.filter((n) => !n.isRead).length;
      return { unreadTicketIds: newSet, notifications: updated, unreadCount: newUnread };
    });
  },

  markTicketUnread: async (ticketId: string) => {
    await api.markTicketNotificationsUnread(ticketId);
    set((s) => {
      const newSet = new Set(s.unreadTicketIds);
      newSet.add(ticketId);
      const updated = s.notifications.map((n) =>
        (n.data?.ticketId === ticketId && n.isRead) ? { ...n, isRead: false } : n
      );
      const newUnread = updated.filter((n) => !n.isRead).length;
      return { unreadTicketIds: newSet, notifications: updated, unreadCount: newUnread };
    });
  },

  hasUnreadForTicket: (ticketId: string) => {
    return get().unreadTicketIds.has(ticketId);
  },
}));
