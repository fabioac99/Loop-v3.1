import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { EventsGateway } from '../gateway/events.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private gateway: EventsGateway,
  ) { }

  async getForUser(userId: string, params: { unreadOnly?: boolean; page?: number; limit?: number }) {
    const { unreadOnly = false, page: rawPage, limit: rawLimit } = params;
    const page = parseInt(String(rawPage), 10) || 1;
    const limit = parseInt(String(rawLimit), 10) || 20;
    const where: any = { userId };
    if (unreadOnly) where.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where, orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit, take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);
    return { data: notifications, total, unreadCount, page, limit };
  }

  async markAsRead(userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAsUnread(userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: false, readAt: null },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async getUnreadTicketIds(userId: string): Promise<string[]> {
    const notifications = await this.prisma.notification.findMany({
      where: { userId, isRead: false },
      select: { data: true },
    });
    const ticketIds = new Set<string>();
    for (const n of notifications) {
      const d = n.data as any;
      if (d?.ticketId) ticketIds.add(d.ticketId);
    }
    return Array.from(ticketIds);
  }

  async markTicketNotificationsRead(userId: string, ticketId: string) {
    const notifications = await this.prisma.notification.findMany({
      where: { userId, isRead: false },
    });
    const ids = notifications
      .filter((n) => (n.data as any)?.ticketId === ticketId)
      .map((n) => n.id);
    if (ids.length > 0) {
      await this.prisma.notification.updateMany({
        where: { id: { in: ids } },
        data: { isRead: true, readAt: new Date() },
      });
    }
    return { markedCount: ids.length };
  }

  async markTicketNotificationsUnread(userId: string, ticketId: string) {
    const notifications = await this.prisma.notification.findMany({
      where: { userId, isRead: true },
      orderBy: { createdAt: 'desc' },
    });
    const ids = notifications
      .filter((n) => (n.data as any)?.ticketId === ticketId)
      .map((n) => n.id);
    if (ids.length > 0) {
      await this.prisma.notification.updateMany({
        where: { id: { in: ids } },
        data: { isRead: false, readAt: null },
      });
    }
    return { markedCount: ids.length };
  }

  async create(userId: string, type: string, title: string, content: string, data?: any) {
    const notif = await this.prisma.notification.create({
      data: { userId, type, title, content, data },
    });
    this.gateway.newNotification(userId, notif);
    return notif;
  }

  private async isEventEnabled(eventType: string): Promise<{ enabled: boolean; channels: string[] }> {
    const pref = await this.prisma.notificationPreference.findUnique({ where: { eventType } }).catch(() => null);
    if (!pref) return { enabled: true, channels: ['in_app', 'email'] };
    const channels = Array.isArray(pref.channels) ? pref.channels as string[] : ['in_app'];
    return { enabled: pref.enabled, channels };
  }

  private async getUserEmail(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    return user?.email || null;
  }

  async notifyTicketCreated(ticket: any) {
    const { enabled, channels } = await this.isEventEnabled('TICKET_CREATED');
    if (!enabled) return;

    const notifiedIds = new Set<string>();
    notifiedIds.add(ticket.createdById);

    // Notify assigned user
    if (ticket.assignedToId && !notifiedIds.has(ticket.assignedToId)) {
      await this.create(ticket.assignedToId, 'TICKET_ASSIGNED',
        'New ticket assigned to you',
        `Ticket ${ticket.ticketNumber}: ${ticket.title}`,
        { ticketId: ticket.id, ticketNumber: ticket.ticketNumber });
      if (channels.includes('email')) {
        const email = await this.getUserEmail(ticket.assignedToId);
        if (email) this.mail.sendTicketAssigned(email, ticket).catch(() => { });
      }
      notifiedIds.add(ticket.assignedToId);
    }

    // Notify target department head
    const heads = await this.prisma.user.findMany({
      where: { departmentId: ticket.toDepartmentId, departmentRole: 'DEPARTMENT_HEAD', isActive: true },
    });
    for (const head of heads) {
      if (!notifiedIds.has(head.id)) {
        await this.create(head.id, 'TICKET_CREATED',
          'New ticket for your department',
          `Ticket ${ticket.ticketNumber}: ${ticket.title}`,
          { ticketId: ticket.id, ticketNumber: ticket.ticketNumber });
        if (channels.includes('email')) {
          this.mail.sendTicketCreated(head.email, ticket).catch(() => { });
        }
        notifiedIds.add(head.id);
      }
    }

    // Notify watchers
    const watchers = await this.prisma.ticketWatcher.findMany({ where: { ticketId: ticket.id } });
    for (const w of watchers) {
      if (!notifiedIds.has(w.userId)) {
        await this.create(w.userId, 'TICKET_WATCHER_ADDED',
          'You were added to a ticket',
          `Ticket ${ticket.ticketNumber}: ${ticket.title}`,
          { ticketId: ticket.id, ticketNumber: ticket.ticketNumber });
        if (channels.includes('email')) {
          const email = await this.getUserEmail(w.userId);
          if (email) this.mail.sendTicketCreated(email, ticket).catch(() => { });
        }
        notifiedIds.add(w.userId);
      }
    }
  }

  async notifyTicketAssigned(ticket: any) {
    const { enabled, channels } = await this.isEventEnabled('TICKET_ASSIGNED');
    if (!enabled) return;
    if (ticket.assignedToId) {
      await this.create(ticket.assignedToId, 'TICKET_ASSIGNED',
        'Ticket assigned to you',
        `Ticket ${ticket.ticketNumber}: ${ticket.title}`,
        { ticketId: ticket.id, ticketNumber: ticket.ticketNumber });
      if (channels.includes('email')) {
        const email = await this.getUserEmail(ticket.assignedToId);
        if (email) this.mail.sendTicketAssigned(email, ticket).catch(() => { });
      }
    }
  }

  async notifyStatusChanged(ticket: any, oldStatus: string, newStatus: string) {
    const { enabled, channels } = await this.isEventEnabled('STATUS_CHANGED');
    if (!enabled) return;
    const watchers = await this.prisma.ticketWatcher.findMany({ where: { ticketId: ticket.id } });
    const notifiedIds = new Set<string>();

    // Collect all users who should be notified: watchers + assignee + creator
    const recipients: string[] = watchers.map((w: any) => w.userId);
    if (ticket.assignedToId) recipients.push(ticket.assignedToId);
    if (ticket.createdById) recipients.push(ticket.createdById);

    for (const userId of recipients) {
      if (notifiedIds.has(userId)) continue;
      notifiedIds.add(userId);
      await this.create(userId, 'STATUS_CHANGED',
        `Ticket ${ticket.ticketNumber} status changed`,
        `Status changed from ${oldStatus} to ${newStatus}`,
        { ticketId: ticket.id, ticketNumber: ticket.ticketNumber, oldStatus, newStatus });
      if (channels.includes('email')) {
        const email = await this.getUserEmail(userId);
        if (email) this.mail.sendStatusChanged(email, ticket, oldStatus, newStatus).catch(() => { });
      }
    }
  }

  async notifyNewMessage(ticket: any, message: any, sender: any) {
    const { enabled, channels } = await this.isEventEnabled('NEW_MESSAGE');
    if (!enabled) return;
    const watchers = await this.prisma.ticketWatcher.findMany({ where: { ticketId: ticket.id } });
    const notifiedIds = new Set<string>();
    notifiedIds.add(sender.id); // Don't notify the sender

    // Collect all: watchers + assignee + creator
    const recipients: string[] = watchers.map((w: any) => w.userId);
    if (ticket.assignedToId) recipients.push(ticket.assignedToId);
    if (ticket.createdById) recipients.push(ticket.createdById);

    for (const userId of recipients) {
      if (notifiedIds.has(userId)) continue;
      notifiedIds.add(userId);
      await this.create(userId, 'NEW_MESSAGE',
        `New reply on ${ticket.ticketNumber}`,
        `${sender.firstName} ${sender.lastName} replied`,
        { ticketId: ticket.id, ticketNumber: ticket.ticketNumber, messageId: message.id });
      if (channels.includes('email')) {
        const email = await this.getUserEmail(userId);
        if (email) this.mail.sendNewMessage(email, ticket, `${sender.firstName} ${sender.lastName}`).catch(() => { });
      }
    }
    // Handle mentions
    if (message.mentions?.length) {
      const mentionedUsers = await this.prisma.user.findMany({ where: { id: { in: message.mentions } } });
      for (const u of mentionedUsers) {
        await this.create(u.id, 'MENTIONED',
          `You were mentioned in ${ticket.ticketNumber}`,
          `${sender.firstName} ${sender.lastName} mentioned you`,
          { ticketId: ticket.id, ticketNumber: ticket.ticketNumber, messageId: message.id });
        if (channels.includes('email')) {
          this.mail.sendMentioned(u.email, ticket, `${sender.firstName} ${sender.lastName}`).catch(() => { });
        }
      }
    }
  }

  async getPreferences(_userId: string) {
    return this.prisma.notificationPreference.findMany({ orderBy: { eventType: 'asc' } });
  }

  async updatePreferences(_userId: string, prefs: any[]) {
    for (const p of prefs) {
      await this.prisma.notificationPreference.upsert({
        where: { eventType: p.eventType },
        update: { enabled: p.enabled, channels: p.channels || ['in_app'] },
        create: { eventType: p.eventType, label: p.label || p.eventType, enabled: p.enabled, channels: p.channels || ['in_app'] },
      });
    }
    return this.getPreferences(_userId);
  }
}