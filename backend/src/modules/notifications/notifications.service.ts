import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) { }

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

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async create(userId: string, type: string, title: string, content: string, data?: any) {
    return this.prisma.notification.create({
      data: { userId, type, title, content, data },
    });
  }

  async notifyTicketCreated(ticket: any) {
    // Notify assigned user
    if (ticket.assignedToId) {
      await this.create(ticket.assignedToId, 'TICKET_ASSIGNED',
        'New ticket assigned to you',
        `Ticket ${ticket.ticketNumber}: ${ticket.title}`,
        { ticketId: ticket.id, ticketNumber: ticket.ticketNumber });
    }
    // Notify target department head
    const heads = await this.prisma.user.findMany({
      where: { departmentId: ticket.toDepartmentId, departmentRole: 'DEPARTMENT_HEAD', isActive: true },
    });
    for (const head of heads) {
      if (head.id !== ticket.createdById) {
        await this.create(head.id, 'TICKET_CREATED',
          'New ticket for your department',
          `Ticket ${ticket.ticketNumber}: ${ticket.title}`,
          { ticketId: ticket.id, ticketNumber: ticket.ticketNumber });
      }
    }
  }

  async notifyTicketAssigned(ticket: any) {
    if (ticket.assignedToId) {
      await this.create(ticket.assignedToId, 'TICKET_ASSIGNED',
        'Ticket assigned to you',
        `Ticket ${ticket.ticketNumber}: ${ticket.title}`,
        { ticketId: ticket.id, ticketNumber: ticket.ticketNumber });
    }
  }

  async notifyStatusChanged(ticket: any, oldStatus: string, newStatus: string) {
    const watchers = await this.prisma.ticketWatcher.findMany({ where: { ticketId: ticket.id } });
    for (const w of watchers) {
      await this.create(w.userId, 'STATUS_CHANGED',
        `Ticket ${ticket.ticketNumber} status changed`,
        `Status changed from ${oldStatus} to ${newStatus}`,
        { ticketId: ticket.id, ticketNumber: ticket.ticketNumber, oldStatus, newStatus });
    }
  }

  async notifyNewMessage(ticket: any, message: any, sender: any) {
    const watchers = await this.prisma.ticketWatcher.findMany({ where: { ticketId: ticket.id } });
    for (const w of watchers) {
      if (w.userId !== sender.id) {
        await this.create(w.userId, 'NEW_MESSAGE',
          `New reply on ${ticket.ticketNumber}`,
          `${sender.firstName} ${sender.lastName} replied`,
          { ticketId: ticket.id, ticketNumber: ticket.ticketNumber, messageId: message.id });
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
      }
    }
  }

  async getPreferences(userId: string) {
    return this.prisma.notificationPreference.findMany({ where: { userId } });
  }

  async updatePreferences(userId: string, prefs: any[]) {
    for (const p of prefs) {
      await this.prisma.notificationPreference.upsert({
        where: { userId_eventType_channel: { userId, eventType: p.eventType, channel: p.channel } },
        update: { isEnabled: p.isEnabled, frequency: p.frequency },
        create: { userId, eventType: p.eventType, channel: p.channel, isEnabled: p.isEnabled, frequency: p.frequency },
      });
    }
    return this.getPreferences(userId);
  }
}
