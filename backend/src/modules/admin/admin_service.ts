import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // ==================== PERMISSIONS ====================

  async getAllPermissions() {
    return this.prisma.permission.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] });
  }

  async getUserPermissions(userId: string) {
    return this.prisma.userPermission.findMany({
      where: { userId },
      include: { permission: true },
    });
  }

  async setUserPermissions(userId: string, permissionNames: string[]) {
    // Delete all existing
    await this.prisma.userPermission.deleteMany({ where: { userId } });
    // Create new
    if (permissionNames.length > 0) {
      await this.prisma.userPermission.createMany({
        data: permissionNames.map(name => ({ userId, permissionName: name })),
        skipDuplicates: true,
      });
    }
    return this.getUserPermissions(userId);
  }

  async userHasPermission(userId: string, permissionName: string): Promise<boolean> {
    // Global admins have all permissions
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { globalRole: true } });
    if (user?.globalRole === 'GLOBAL_ADMIN') return true;

    const perm = await this.prisma.userPermission.findUnique({
      where: { userId_permissionName: { userId, permissionName } },
    });
    return !!perm;
  }

  // ==================== CUSTOM STATUSES ====================

  async getStatuses() {
    return this.prisma.customStatus.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async createStatus(data: { name: string; label: string; color: string; isClosedState?: boolean }) {
    const maxOrder = await this.prisma.customStatus.aggregate({ _max: { sortOrder: true } });
    return this.prisma.customStatus.create({
      data: { ...data, name: data.name.toUpperCase().replace(/\s+/g, '_'), sortOrder: (maxOrder._max.sortOrder || 0) + 1 },
    });
  }

  async updateStatus(id: string, data: any) {
    return this.prisma.customStatus.update({ where: { id }, data });
  }

  async deleteStatus(id: string) {
    // Soft delete by deactivating
    return this.prisma.customStatus.update({ where: { id }, data: { isActive: false } });
  }

  // ==================== CUSTOM PRIORITIES ====================

  async getPriorities() {
    return this.prisma.customPriority.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async createPriority(data: { name: string; label: string; color: string; slaResponseHours: number; slaResolutionHours: number }) {
    const maxOrder = await this.prisma.customPriority.aggregate({ _max: { sortOrder: true } });
    return this.prisma.customPriority.create({
      data: { ...data, name: data.name.toUpperCase().replace(/\s+/g, '_'), sortOrder: (maxOrder._max.sortOrder || 0) + 1 },
    });
  }

  async updatePriority(id: string, data: any) {
    return this.prisma.customPriority.update({ where: { id }, data });
  }

  async deletePriority(id: string) {
    return this.prisma.customPriority.update({ where: { id }, data: { isActive: false } });
  }

  // ==================== TICKET DELETION ====================

  async deleteTicket(ticketId: string, userId: string) {
    const hasPermission = await this.userHasPermission(userId, 'tickets.delete');
    if (!hasPermission) throw new ForbiddenException('No permission to delete tickets');

    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    // Check if user can delete any ticket or only own
    const canDeleteAny = await this.userHasPermission(userId, 'tickets.delete_any');
    if (!canDeleteAny && ticket.createdById !== userId) {
      throw new ForbiddenException('Can only delete your own tickets');
    }

    await this.prisma.ticket.delete({ where: { id: ticketId } });

    await this.prisma.auditLog.create({
      data: { action: 'TICKET_DELETED', entityType: 'ticket', entityId: ticketId, userId, metadata: { ticketNumber: ticket.ticketNumber, title: ticket.title } },
    });

    return { deleted: true };
  }

  // ==================== TICKET FORWARDING ====================

  async forwardTicket(ticketId: string, fromUserId: string, toUserId: string, message?: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    // Create forward record
    const forward = await this.prisma.ticketForward.create({
      data: { ticketId, fromUserId, toUserId, message },
      include: { fromUser: { select: { firstName: true, lastName: true } }, toUser: { select: { firstName: true, lastName: true } } },
    });

    // Auto-add target user as watcher
    await this.prisma.ticketWatcher.upsert({
      where: { ticketId_userId: { ticketId, userId: toUserId } },
      update: {},
      create: { ticketId, userId: toUserId },
    });

    // Create notification for target user
    await this.prisma.notification.create({
      data: {
        userId: toUserId,
        type: 'TICKET_FORWARDED',
        title: `Ticket forwarded to you`,
        content: `${forward.fromUser.firstName} ${forward.fromUser.lastName} forwarded ticket ${ticket.ticketNumber}: ${ticket.title}`,
        data: { ticketId, ticketNumber: ticket.ticketNumber },
      },
    });

    // Add history entry
    await this.prisma.ticketHistory.create({
      data: { ticketId, field: 'forwarded', newValue: `${forward.toUser.firstName} ${forward.toUser.lastName}`, changedById: fromUserId },
    });

    return forward;
  }

  async getForwards(ticketId: string) {
    return this.prisma.ticketForward.findMany({
      where: { ticketId },
      include: {
        fromUser: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        toUser: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
