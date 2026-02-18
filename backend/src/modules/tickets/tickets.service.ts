import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { FilesService } from '../files/files.service';
import { TicketStatus, TicketPriority } from '@prisma/client';

@Injectable()
export class TicketsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private filesService: FilesService,
  ) {}

  private checkAccess(ticket: any, user: any) {
    if (user.globalRole === 'GLOBAL_ADMIN') return;
    if (user.departmentRole === 'DEPARTMENT_HEAD' && 
        (ticket.toDepartmentId === user.departmentId || ticket.fromDepartmentId === user.departmentId)) return;
    if (ticket.createdById === user.id || ticket.assignedToId === user.id) return;
    if (ticket.toDepartmentId === user.departmentId || ticket.fromDepartmentId === user.departmentId) return;
    throw new ForbiddenException('Access denied');
  }

  async findAll(user: any, params: any) {
    const { page: rawPage, limit: rawLimit, sortBy = 'createdAt', sortOrder = 'desc', ...filters } = params;
    const page = parseInt(rawPage, 10) || 1;
    const limit = parseInt(rawLimit, 10) || 25;
    const where: any = {};

    if (user.globalRole !== 'GLOBAL_ADMIN') {
      where.OR = [
        { createdById: user.id },
        { assignedToId: user.id },
        { toDepartmentId: user.departmentId },
        { fromDepartmentId: user.departmentId },
        { watchers: { some: { userId: user.id } } },
      ];
    }

    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.fromDepartmentId) where.fromDepartmentId = filters.fromDepartmentId;
    if (filters.toDepartmentId) where.toDepartmentId = filters.toDepartmentId;
    if (filters.assignedToId) where.assignedToId = filters.assignedToId;
    if (filters.createdById) where.createdById = filters.createdById;
    if (filters.tags?.length) where.tags = { hasSome: filters.tags };
    if (filters.overdue === true || filters.overdue === 'true') {
      where.slaResolutionDeadline = { lt: new Date() };
      where.status = { notIn: ['CLOSED', 'REJECTED'] };
    }
    if (filters.search) {
      where.AND = [...(where.AND || []), {
        OR: [
          { ticketNumber: { contains: filters.search, mode: 'insensitive' } },
          { title: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ],
      }];
    }

    const [tickets, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        include: {
          fromDepartment: { select: { id: true, name: true, slug: true, color: true } },
          toDepartment: { select: { id: true, name: true, slug: true, color: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true } },
          assignedTo: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true } },
          subtype: { select: { id: true, name: true, category: { select: { id: true, name: true } } } },
          _count: { select: { messages: true, attachments: true, watchers: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return { data: tickets, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, user: any) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { OR: [{ id }, { ticketNumber: id }] },
      include: {
        fromDepartment: true, toDepartment: true,
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true, departmentId: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true, departmentId: true } },
        subtype: { include: { category: true, formSchema: true } },
        messages: {
          where: { isDeleted: false },
          include: {
            author: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true } },
            attachments: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        attachments: true,
        watchers: { include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } } },
        historyLogs: { orderBy: { createdAt: 'desc' }, take: 50 },
        formSubmission: true,
        duplicateOf: { select: { id: true, ticketNumber: true, title: true } },
        duplicates: { select: { id: true, ticketNumber: true, title: true } },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    this.checkAccess(ticket, user);

    let internalNotes: any[] = [];
    if (user.globalRole === 'GLOBAL_ADMIN' || user.departmentId === ticket.toDepartmentId) {
      internalNotes = await this.prisma.internalNote.findMany({
        where: { ticketId: ticket.id },
        include: { author: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
        orderBy: { createdAt: 'desc' },
      });
    }
    return { ...ticket, internalNotes };
  }

  async create(user: any, data: any) {
    const ticketNumber = await this.prisma.getNextTicketNumber();
    let slaResponseHours = 24, slaResolutionHours = 72;
    let defaultPriority: TicketPriority = TicketPriority.NORMAL;

    if (data.subtypeId) {
      const subtype = await this.prisma.requestSubtype.findUnique({ where: { id: data.subtypeId } });
      if (subtype) {
        if (subtype.slaResponseHours) slaResponseHours = subtype.slaResponseHours;
        if (subtype.slaResolutionHours) slaResolutionHours = subtype.slaResolutionHours;
        defaultPriority = subtype.defaultPriority as TicketPriority;
      }
    }

    const priority = data.priority || defaultPriority;
    const now = new Date();
    const ticket = await this.prisma.ticket.create({
      data: {
        ticketNumber, title: data.title, description: data.description,
        status: 'OPEN', priority,
        fromDepartmentId: user.departmentId, toDepartmentId: data.toDepartmentId,
        subtypeId: data.subtypeId || null,
        createdById: user.id,
        assignedToId: data.assignedToId || null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        tags: data.tags || [],
        slaResponseDeadline: new Date(now.getTime() + slaResponseHours * 3600000),
        slaResolutionDeadline: new Date(now.getTime() + slaResolutionHours * 3600000),
      },
      include: { fromDepartment: true, toDepartment: true, createdBy: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true } }, assignedTo: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true } } },
    });

    if (data.formData && data.subtypeId && data.subtypeId.length > 0) {
      const subtype = await this.prisma.requestSubtype.findUnique({ where: { id: data.subtypeId }, include: { formSchema: true } });
      if (subtype?.formSchemaId) {
        await this.prisma.formSubmission.create({
          data: { formSchemaId: subtype.formSchemaId, ticketId: ticket.id, data: data.formData, schemaVersion: subtype.formSchema?.version || 1 },
        });
      }
    }

    await this.prisma.ticketWatcher.create({ data: { ticketId: ticket.id, userId: user.id } });

    // Add additional watchers (CC)
    if (data.watcherIds?.length) {
      for (const watcherId of data.watcherIds) {
        if (watcherId !== user.id) {
          await this.prisma.ticketWatcher.upsert({
            where: { ticketId_userId: { ticketId: ticket.id, userId: watcherId } },
            update: {},
            create: { ticketId: ticket.id, userId: watcherId },
          });
        }
      }
    }

    await this.prisma.ticketHistory.create({ data: { ticketId: ticket.id, field: 'status', newValue: 'OPEN', changedById: user.id } });
    await this.prisma.auditLog.create({ data: { action: 'TICKET_CREATED', entityType: 'ticket', entityId: ticket.id, userId: user.id, metadata: { ticketNumber, title: data.title } } });

    // Link uploaded attachments to this ticket
    if (data.attachmentIds?.length) {
      await this.filesService.linkToTicket(data.attachmentIds, ticket.id);
    }

    await this.notifications.notifyTicketCreated(ticket);
    return ticket;
  }

  async update(id: string, user: any, data: any) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const changes: { ticketId: string; field: string; oldValue: string; newValue: string; changedById: string }[] = [];
    const updateData: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && (ticket as any)[key] !== value) {
        changes.push({ ticketId: id, field: key, oldValue: String((ticket as any)[key] ?? ''), newValue: String(value), changedById: user.id });
        updateData[key] = key === 'dueDate' ? new Date(value as string) : value;
      }
    }

    if (data.status === 'WAITING_REPLY' && ticket.status !== 'WAITING_REPLY') {
      updateData.slaPausedAt = new Date();
    } else if (data.status && data.status !== 'WAITING_REPLY' && ticket.slaPausedAt) {
      const pausedSec = Math.floor((Date.now() - ticket.slaPausedAt.getTime()) / 1000);
      updateData.slaPausedDuration = ticket.slaPausedDuration + pausedSec;
      updateData.slaPausedAt = null;
      if (ticket.slaResponseDeadline) updateData.slaResponseDeadline = new Date(ticket.slaResponseDeadline.getTime() + pausedSec * 1000);
      if (ticket.slaResolutionDeadline) updateData.slaResolutionDeadline = new Date(ticket.slaResolutionDeadline.getTime() + pausedSec * 1000);
    }
    if (data.status === 'CLOSED') { updateData.closedAt = new Date(); updateData.slaResolvedAt = new Date(); }
    if (data.status === 'IN_PROGRESS' && !ticket.slaResponseAt) { updateData.slaResponseAt = new Date(); }

    const updated = await this.prisma.ticket.update({
      where: { id }, data: updateData,
      include: { fromDepartment: true, toDepartment: true, createdBy: { select: { id: true, firstName: true, lastName: true, email: true } }, assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });

    if (changes.length) await this.prisma.ticketHistory.createMany({ data: changes });
    if (data.status && data.status !== ticket.status) {
      await this.prisma.auditLog.create({ data: { action: 'TICKET_STATUS_CHANGED', entityType: 'ticket', entityId: id, userId: user.id, metadata: { from: ticket.status, to: data.status } } });
      await this.notifications.notifyStatusChanged(updated, ticket.status, data.status);
    }
    if (data.assignedToId && data.assignedToId !== ticket.assignedToId) {
      await this.prisma.auditLog.create({ data: { action: 'TICKET_ASSIGNED', entityType: 'ticket', entityId: id, userId: user.id, metadata: { assignedToId: data.assignedToId } } });
      await this.notifications.notifyTicketAssigned(updated);
    }
    return updated;
  }

  async addMessage(ticketId: string, user: any, data: { content: string; mentions?: string[]; attachmentIds?: string[] }) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const message = await this.prisma.message.create({
      data: { ticketId, authorId: user.id, content: data.content, mentions: data.mentions || [] },
      include: { author: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true } }, attachments: true },
    });

    // Link uploaded attachments to this message
    if (data.attachmentIds?.length) {
      await this.filesService.linkToMessage(data.attachmentIds, message.id);
      // Also link to the ticket
      await this.filesService.linkToTicket(data.attachmentIds, ticketId);
    }

    await this.prisma.ticket.update({ where: { id: ticketId }, data: { updatedAt: new Date() } });
    await this.notifications.notifyNewMessage(ticket, message, user);

    // Re-fetch with linked attachments
    return this.prisma.message.findUnique({
      where: { id: message.id },
      include: { author: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true } }, attachments: true },
    });
  }

  async editMessage(messageId: string, user: any, content: string) {
    const msg = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!msg || msg.authorId !== user.id) throw new ForbiddenException();
    return this.prisma.message.update({ where: { id: messageId }, data: { content, isEdited: true } });
  }

  async deleteMessage(messageId: string, user: any) {
    const msg = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!msg || msg.authorId !== user.id) throw new ForbiddenException();
    return this.prisma.message.update({ where: { id: messageId }, data: { isDeleted: true } });
  }

  async addInternalNote(ticketId: string, user: any, content: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException();
    if (user.globalRole !== 'GLOBAL_ADMIN' && user.departmentId !== ticket.toDepartmentId) throw new ForbiddenException();

    return this.prisma.internalNote.create({
      data: { ticketId, authorId: user.id, content },
      include: { author: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
    });
  }

  async addWatcher(ticketId: string, userId: string) {
    return this.prisma.ticketWatcher.upsert({
      where: { ticketId_userId: { ticketId, userId } },
      update: {},
      create: { ticketId, userId },
    });
  }

  async removeWatcher(ticketId: string, userId: string) {
    return this.prisma.ticketWatcher.deleteMany({ where: { ticketId, userId } });
  }

  async duplicate(id: string, user: any) {
    const original = await this.prisma.ticket.findUnique({ where: { id }, include: { formSubmission: true } });
    if (!original) throw new NotFoundException();

    const ticketNumber = await this.prisma.getNextTicketNumber();
    const dup = await this.prisma.ticket.create({
      data: {
        ticketNumber, title: `[DUP] ${original.title}`, description: original.description,
        status: 'OPEN', priority: original.priority,
        fromDepartmentId: original.fromDepartmentId, toDepartmentId: original.toDepartmentId,
        subtypeId: original.subtypeId, createdById: user.id,
        tags: original.tags, duplicateOfId: original.id,
        slaResponseDeadline: new Date(Date.now() + 24 * 3600000),
        slaResolutionDeadline: new Date(Date.now() + 72 * 3600000),
      },
    });

    if (original.formSubmission) {
      await this.prisma.formSubmission.create({
        data: { formSchemaId: original.formSubmission.formSchemaId, ticketId: dup.id, data: original.formSubmission.data as any },
      });
    }

    await this.prisma.auditLog.create({ data: { action: 'TICKET_DUPLICATED', entityType: 'ticket', entityId: dup.id, userId: user.id, metadata: { originalId: id } } });
    return dup;
  }

  async executeAction(ticketId: string, user: any, action: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId }, include: { subtype: true } });
    if (!ticket) throw new NotFoundException();

    const actions = (ticket.subtype?.actions as any) || {};
    const actionDef = actions[action];
    if (!actionDef) throw new NotFoundException('Action not found');

    const updateData: any = {};
    if (actionDef.setStatus) updateData.status = actionDef.setStatus;
    if (actionDef.setStatus === 'CLOSED') updateData.closedAt = new Date();

    const updated = await this.prisma.ticket.update({ where: { id: ticketId }, data: updateData });
    await this.prisma.ticketHistory.create({ data: { ticketId, field: 'action', newValue: action, changedById: user.id } });
    await this.prisma.auditLog.create({ data: { action: 'TICKET_STATUS_CHANGED', entityType: 'ticket', entityId: ticketId, userId: user.id, metadata: { action, ...updateData } } });
    return updated;
  }

  async getDashboard(user: any) {
    const userId = user.id;
    const deptId = user.departmentId;
    const isAdmin = user.globalRole === 'GLOBAL_ADMIN';

    const [myOpen, waitingForMe, departmentTickets, recentlyUpdated, byStatus, byPriority, overdueCount] = await Promise.all([
      this.prisma.ticket.count({ where: { createdById: userId, status: { notIn: ['CLOSED', 'REJECTED'] } } }),
      this.prisma.ticket.count({ where: { OR: [{ assignedToId: userId }, { toDepartmentId: deptId }], status: { notIn: ['CLOSED', 'REJECTED'] } } }),
      deptId ? this.prisma.ticket.count({ where: { toDepartmentId: deptId, status: { notIn: ['CLOSED', 'REJECTED'] } } }) : 0,
      this.prisma.ticket.findMany({
        where: isAdmin ? {} : { OR: [{ createdById: userId }, { assignedToId: userId }, { toDepartmentId: deptId }, { fromDepartmentId: deptId }] },
        orderBy: { updatedAt: 'desc' }, take: 10,
        include: { fromDepartment: { select: { name: true, color: true } }, toDepartment: { select: { name: true, color: true } }, createdBy: { select: { firstName: true, lastName: true } } },
      }),
      this.prisma.ticket.groupBy({ by: ['status'], _count: true, where: isAdmin ? {} : { OR: [{ createdById: userId }, { toDepartmentId: deptId }] } }),
      this.prisma.ticket.groupBy({ by: ['priority'], _count: true, where: isAdmin ? {} : { OR: [{ createdById: userId }, { toDepartmentId: deptId }] } }),
      this.prisma.ticket.count({ where: { slaResolutionDeadline: { lt: new Date() }, status: { notIn: ['CLOSED', 'REJECTED'] }, ...(isAdmin ? {} : { OR: [{ createdById: userId }, { toDepartmentId: deptId }] }) } }),
    ]);

    return { myOpen, waitingForMe, departmentTickets, recentlyUpdated, byStatus, byPriority, overdueCount };
  }
}
