import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { FilesService } from '../files/files.service';
import { TicketStatus, TicketPriority } from '@prisma/client';
import { addWorkHours, parseWorkHoursFromSettings } from '../../common/utils/sla-calculator';

@Injectable()
export class TicketsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private filesService: FilesService,
  ) { }

  private async checkAccess(ticket: any, user: any) {
    if (user.globalRole === 'GLOBAL_ADMIN') return;
    // Department heads can see all tickets to/from their department
    if (user.departmentRole === 'DEPARTMENT_HEAD' &&
      (ticket.toDepartmentId === user.departmentId || ticket.fromDepartmentId === user.departmentId)) return;
    // Regular users: only created, assigned, or watching
    if (ticket.createdById === user.id || ticket.assignedToId === user.id) return;
    // Check if user is a watcher
    const watcher = await this.prisma.ticketWatcher.findUnique({
      where: { ticketId_userId: { ticketId: ticket.id, userId: user.id } },
    });
    if (watcher) return;
    throw new ForbiddenException('Access denied');
  }

  async findAll(user: any, params: any) {
    const { page: rawPage, limit: rawLimit, sortBy = 'createdAt', sortOrder = 'desc', view, ...filters } = params;
    const page = parseInt(rawPage, 10) || 1;
    const limit = parseInt(rawLimit, 10) || 25;
    const where: any = {};
    const isDeptHead = user.departmentRole === 'DEPARTMENT_HEAD';

    if (user.globalRole !== 'GLOBAL_ADMIN') {
      if (view === 'drafts') {
        where.createdById = user.id;
        where.status = 'DRAFT';
      } else if (view === 'archived') {
        where.isArchived = true;
        where.OR = [
          { createdById: user.id },
          { assignedToId: user.id },
          { watchers: { some: { userId: user.id } } },
        ];
        if (isDeptHead) {
          where.OR.push({ toDepartmentId: user.departmentId });
          where.OR.push({ fromDepartmentId: user.departmentId });
        }
      } else if (view === 'department' && isDeptHead) {
        where.isArchived = false;
        where.OR = [
          { toDepartmentId: user.departmentId },
          { fromDepartmentId: user.departmentId },
        ];
      } else if (view === 'personal') {
        where.isArchived = false;
        where.OR = [
          { createdById: user.id },
          { assignedToId: user.id },
          { watchers: { some: { userId: user.id } } },
        ];
      } else {
        where.isArchived = false;
        const orConditions: any[] = [
          { createdById: user.id },
          { assignedToId: user.id },
          { watchers: { some: { userId: user.id } } },
        ];
        if (isDeptHead) {
          orConditions.push({ toDepartmentId: user.departmentId });
          orConditions.push({ fromDepartmentId: user.departmentId });
        }
        where.OR = orConditions;
      }
    } else {
      if (view === 'drafts') {
        where.createdById = user.id;
        where.status = 'DRAFT';
      } else if (view === 'archived') {
        where.isArchived = true;
      } else {
        where.isArchived = false;
      }
    }

    // Only apply status filter if not already set by view
    if (filters.status && view !== 'drafts') where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.fromDepartmentId) where.fromDepartmentId = filters.fromDepartmentId;
    if (filters.toDepartmentId) where.toDepartmentId = filters.toDepartmentId;
    if (filters.assignedToId) where.assignedToId = filters.assignedToId;
    if (filters.createdById) where.createdById = filters.createdById;
    if (filters.tags?.length) where.tags = { hasSome: filters.tags };
    // KPI filters
    if (filters.assignedToMe === 'true') {
      where.assignedToId = user.id;
      if (!where.status) where.status = { notIn: ['CLOSED', 'REJECTED'] };
    }
    if (filters.watchingOnly === 'true') {
      where.watchers = { some: { userId: user.id } };
      if (!where.status) where.status = { notIn: ['CLOSED', 'REJECTED'] };
    }
    if (filters.unassigned === 'true') {
      where.assignedToId = null;
      if (!where.status) where.status = { notIn: ['CLOSED', 'REJECTED'] };
    }
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

    // Override SLA from custom priorities table if available
    try {
      const customPriority = await this.prisma.customPriority.findUnique({ where: { name: priority } });
      if (customPriority) {
        slaResponseHours = customPriority.slaResponseHours;
        slaResolutionHours = customPriority.slaResolutionHours;
      }
    } catch { }

    const now = new Date();

    // Load work hours config from system settings
    let workConfig;
    try {
      const allSettings = await this.prisma.systemSetting.findMany();
      const settingsMap = Object.fromEntries(allSettings.map(s => [s.key, s.value]));
      workConfig = parseWorkHoursFromSettings(settingsMap);
    } catch {
      workConfig = undefined;
    }

    // Build metadata from entity selection
    const metadata: any = {};
    if (data.formData?._entityType && data.formData._entityType !== 'none') {
      metadata.entityType = data.formData._entityType;
      metadata.entityId = data.formData._entityId || null;
      metadata.entityName = data.formData._entityName || null;
    }

    const ticket = await this.prisma.ticket.create({
      data: {
        ticketNumber, title: data.title, description: data.description || '',
        status: data.isDraft ? 'DRAFT' : 'OPEN', priority,
        fromDepartmentId: user.departmentId, toDepartmentId: data.toDepartmentId,
        subtypeId: data.subtypeId || null,
        createdById: user.id,
        assignedToId: data.assignedToId || null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        tags: data.tags || [],
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        slaResponseDeadline: workConfig ? addWorkHours(now, slaResponseHours, workConfig) : new Date(now.getTime() + slaResponseHours * 3600000),
        slaResolutionDeadline: workConfig ? addWorkHours(now, slaResolutionHours, workConfig) : new Date(now.getTime() + slaResolutionHours * 3600000),
      },
      include: { fromDepartment: true, toDepartment: true, createdBy: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true } }, assignedTo: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true } } },
    });

    // Save form submission: from schema fields + always save if formData has content
    const cleanFormData = { ...data.formData };
    delete cleanFormData._entityType;
    delete cleanFormData._entityId;
    delete cleanFormData._entityName;

    if (data.subtypeId) {
      const subtype = await this.prisma.requestSubtype.findUnique({ where: { id: data.subtypeId }, include: { formSchema: true } });
      if (subtype?.formSchemaId && Object.keys(cleanFormData).length > 0) {
        await this.prisma.formSubmission.create({
          data: { formSchemaId: subtype.formSchemaId, ticketId: ticket.id, data: cleanFormData, schemaVersion: subtype.formSchema?.version || 1 },
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

    await this.prisma.ticketHistory.create({ data: { ticketId: ticket.id, field: 'status', newValue: data.isDraft ? 'DRAFT' : 'OPEN', changedById: user.id } });
    await this.prisma.auditLog.create({ data: { action: 'TICKET_CREATED', entityType: 'ticket', entityId: ticket.id, userId: user.id, metadata: { ticketNumber, title: data.title } } });

    // Link uploaded attachments to this ticket
    if (data.attachmentIds?.length) {
      await this.filesService.linkToTicket(data.attachmentIds, ticket.id);
    }

    // Only notify if not a draft
    if (!data.isDraft) {
      await this.notifications.notifyTicketCreated(ticket);
    }
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
    const isDeptHead = user.departmentRole === 'DEPARTMENT_HEAD';

    const openFilter = { status: { notIn: ['CLOSED', 'REJECTED', 'DRAFT'] as any } };
    const ticketIncludes = {
      fromDepartment: { select: { id: true, name: true, color: true } },
      toDepartment: { select: { id: true, name: true, color: true } },
      createdBy: { select: { firstName: true, lastName: true } },
      assignedTo: { select: { id: true, firstName: true, lastName: true, avatar: true } },
    };

    // ---- Personal view ----
    const personalFilter = {
      OR: [
        { createdById: userId },
        { assignedToId: userId },
        { watchers: { some: { userId } } },
      ],
    };

    const [myOpen, assignedToMe, watchingCount, personalRecent, personalByStatus, personalByPriority, personalOverdue, closedThisWeek, avgResolution] = await Promise.all([
      this.prisma.ticket.count({ where: { createdById: userId, ...openFilter } }),
      this.prisma.ticket.count({ where: { assignedToId: userId, ...openFilter } }),
      this.prisma.ticket.count({ where: { watchers: { some: { userId } }, ...openFilter } }),
      this.prisma.ticket.findMany({
        where: personalFilter, orderBy: { updatedAt: 'desc' }, take: 10, include: ticketIncludes,
      }),
      this.prisma.ticket.groupBy({ by: ['status'], _count: true, where: personalFilter }),
      this.prisma.ticket.groupBy({ by: ['priority'], _count: true, where: personalFilter }),
      this.prisma.ticket.count({ where: { slaResolutionDeadline: { lt: new Date() }, ...openFilter, ...personalFilter } }),
      // Closed this week
      this.prisma.ticket.count({
        where: { ...personalFilter, status: { in: ['CLOSED', 'REJECTED'] as any }, closedAt: { gte: new Date(Date.now() - 7 * 86400000) } },
      }),
      // Avg resolution time for closed tickets
      this.prisma.ticket.findMany({
        where: { ...personalFilter, closedAt: { not: null } },
        select: { createdAt: true, closedAt: true },
        orderBy: { closedAt: 'desc' },
        take: 50,
      }),
    ]);

    // Calculate avg resolution hours
    const avgResHours = avgResolution.length > 0
      ? avgResolution.reduce((sum, t) => sum + (t.closedAt!.getTime() - t.createdAt.getTime()) / 3600000, 0) / avgResolution.length
      : 0;

    const personal = {
      myOpen, assignedToMe, watchingCount, overdueCount: personalOverdue,
      closedThisWeek, avgResolutionHours: Math.round(avgResHours * 10) / 10,
      recentlyUpdated: personalRecent, byStatus: personalByStatus, byPriority: personalByPriority,
    };

    // ---- Department view ----
    let department: any = null;
    if ((isDeptHead || isAdmin) && deptId) {
      const deptFilter = isAdmin ? {} : {
        OR: [{ toDepartmentId: deptId }, { fromDepartmentId: deptId }],
      };

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

      const [
        deptTotal, deptOpen, deptWaiting, deptOverdue, deptRecent,
        deptByStatus, deptByPriority, deptUnassigned,
        closedThisWeekDept, createdThisWeekDept,
        deptAvgRes, slaBreached, slaMet,
        byDepartment, byAgent,
        ticketsLast30Days,
      ] = await Promise.all([
        this.prisma.ticket.count({ where: deptFilter }),
        this.prisma.ticket.count({ where: { ...deptFilter, ...openFilter } }),
        this.prisma.ticket.count({ where: { ...deptFilter, status: 'WAITING_REPLY' as any } }),
        this.prisma.ticket.count({ where: { ...deptFilter, slaResolutionDeadline: { lt: now }, ...openFilter } }),
        this.prisma.ticket.findMany({
          where: deptFilter, orderBy: { updatedAt: 'desc' }, take: 10, include: ticketIncludes,
        }),
        this.prisma.ticket.groupBy({ by: ['status'], _count: true, where: deptFilter }),
        this.prisma.ticket.groupBy({ by: ['priority'], _count: true, where: deptFilter }),
        this.prisma.ticket.count({ where: { ...deptFilter, assignedToId: null, ...openFilter } }),
        // Closed this week
        this.prisma.ticket.count({
          where: { ...deptFilter, status: { in: ['CLOSED', 'REJECTED'] as any }, closedAt: { gte: sevenDaysAgo } },
        }),
        // Created this week
        this.prisma.ticket.count({
          where: { ...deptFilter, createdAt: { gte: sevenDaysAgo } },
        }),
        // Avg resolution
        this.prisma.ticket.findMany({
          where: { ...deptFilter, closedAt: { not: null } },
          select: { createdAt: true, closedAt: true, slaResolutionDeadline: true },
          orderBy: { closedAt: 'desc' }, take: 100,
        }),
        // SLA breached (closed after deadline)
        this.prisma.ticket.count({
          where: {
            ...deptFilter,
            status: { in: ['CLOSED'] as any },
            closedAt: { not: null },
            slaResolutionDeadline: { not: null },
            AND: [
              { closedAt: { not: null } },
            ],
          },
        }),
        // We'll calculate SLA met/breached from deptAvgRes
        Promise.resolve(0),
        // By department (for admin)
        isAdmin ? this.prisma.ticket.groupBy({
          by: ['toDepartmentId'], _count: true, where: openFilter,
        }) : Promise.resolve([]),
        // By agent
        this.prisma.ticket.groupBy({
          by: ['assignedToId'], _count: true, where: { ...deptFilter, assignedToId: { not: null }, ...openFilter },
        }),
        // Tickets created per day last 30 days
        this.prisma.ticket.findMany({
          where: { ...deptFilter, createdAt: { gte: thirtyDaysAgo } },
          select: { createdAt: true, status: true },
        }),
      ]);

      // Calculate avg resolution & SLA compliance
      const deptAvgHours = deptAvgRes.length > 0
        ? deptAvgRes.reduce((sum, t) => sum + (t.closedAt!.getTime() - t.createdAt.getTime()) / 3600000, 0) / deptAvgRes.length
        : 0;

      let slaMetCount = 0, slaBreachedCount = 0;
      for (const t of deptAvgRes) {
        if (t.slaResolutionDeadline && t.closedAt) {
          if (t.closedAt <= t.slaResolutionDeadline) slaMetCount++;
          else slaBreachedCount++;
        }
      }
      const slaComplianceRate = (slaMetCount + slaBreachedCount) > 0
        ? Math.round((slaMetCount / (slaMetCount + slaBreachedCount)) * 100)
        : 100;

      // Build daily trend (last 30 days)
      const dailyTrend: { date: string; created: number; closed: number }[] = [];
      for (let i = 29; i >= 0; i--) {
        const day = new Date(now.getTime() - i * 86400000);
        const dateStr = day.toISOString().split('T')[0];
        dailyTrend.push({ date: dateStr, created: 0, closed: 0 });
      }
      for (const t of ticketsLast30Days) {
        const dateStr = t.createdAt.toISOString().split('T')[0];
        const entry = dailyTrend.find(d => d.date === dateStr);
        if (entry) entry.created++;
      }
      // Get closed last 30 days for trend
      const closedLast30 = await this.prisma.ticket.findMany({
        where: { ...deptFilter, closedAt: { gte: thirtyDaysAgo } },
        select: { closedAt: true },
      });
      for (const t of closedLast30) {
        if (t.closedAt) {
          const dateStr = t.closedAt.toISOString().split('T')[0];
          const entry = dailyTrend.find(d => d.date === dateStr);
          if (entry) entry.closed++;
        }
      }

      // Get agent details for byAgent
      const agentIds = byAgent.filter((a: any) => a.assignedToId).map((a: any) => a.assignedToId);
      const agents = agentIds.length > 0
        ? await this.prisma.user.findMany({
          where: { id: { in: agentIds } },
          select: { id: true, firstName: true, lastName: true, avatar: true },
        })
        : [];
      const agentMap = Object.fromEntries(agents.map(a => [a.id, a]));
      const agentWorkload = byAgent
        .filter((a: any) => a.assignedToId && agentMap[a.assignedToId])
        .map((a: any) => ({
          id: a.assignedToId,
          name: `${agentMap[a.assignedToId].firstName} ${agentMap[a.assignedToId].lastName}`,
          avatar: agentMap[a.assignedToId].avatar,
          count: a._count,
        }))
        .sort((a: any, b: any) => b.count - a.count);

      // Department breakdown (admin only)
      let deptBreakdown: any[] = [];
      if (isAdmin && (byDepartment as any[]).length > 0) {
        const deptIds = (byDepartment as any[]).map(d => d.toDepartmentId);
        const depts = await this.prisma.department.findMany({
          where: { id: { in: deptIds } },
          select: { id: true, name: true, color: true },
        });
        const deptMap = Object.fromEntries(depts.map(d => [d.id, d]));
        deptBreakdown = (byDepartment as any[])
          .filter(d => deptMap[d.toDepartmentId])
          .map(d => ({
            id: d.toDepartmentId,
            name: deptMap[d.toDepartmentId].name,
            color: deptMap[d.toDepartmentId].color,
            count: d._count,
          }))
          .sort((a, b) => b.count - a.count);
      }

      department = {
        totalTickets: deptTotal, openTickets: deptOpen, waitingReply: deptWaiting,
        overdueCount: deptOverdue, unassigned: deptUnassigned,
        closedThisWeek: closedThisWeekDept, createdThisWeek: createdThisWeekDept,
        avgResolutionHours: Math.round(deptAvgHours * 10) / 10,
        slaComplianceRate, slaMetCount, slaBreachedCount,
        recentlyUpdated: deptRecent, byStatus: deptByStatus, byPriority: deptByPriority,
        dailyTrend, agentWorkload, deptBreakdown,
      };
    }

    return { personal, department, isDeptHead: isDeptHead || isAdmin };
  }

  async getKpiTickets(user: any, type: string, scope: string) {
    const userId = user.id;
    const deptId = user.departmentId;
    const isDeptHead = user.departmentRole === 'DEPARTMENT_HEAD';
    const isAdmin = user.globalRole === 'GLOBAL_ADMIN';
    const openFilter = { status: { notIn: ['CLOSED', 'REJECTED'] as any } };
    const includes = {
      fromDepartment: { select: { name: true, color: true } },
      toDepartment: { select: { name: true, color: true } },
      createdBy: { select: { firstName: true, lastName: true } },
      assignedTo: { select: { firstName: true, lastName: true } },
    };

    let where: any = {};

    if (scope === 'department' && (isDeptHead || isAdmin)) {
      const deptFilter = isAdmin ? {} : { OR: [{ toDepartmentId: deptId }, { fromDepartmentId: deptId }] };
      switch (type) {
        case 'openTickets': where = { ...deptFilter, ...openFilter }; break;
        case 'waitingReply': where = { ...deptFilter, status: 'WAITING_REPLY' }; break;
        case 'unassigned': where = { ...deptFilter, assignedToId: null, ...openFilter }; break;
        case 'totalTickets': where = { ...deptFilter }; break;
        case 'overdueCount': where = { ...deptFilter, slaResolutionDeadline: { lt: new Date() }, ...openFilter }; break;
        default: where = deptFilter;
      }
    } else {
      // Personal scope
      switch (type) {
        case 'myOpen': where = { createdById: userId, ...openFilter }; break;
        case 'assignedToMe': where = { assignedToId: userId, ...openFilter }; break;
        case 'watchingCount': where = { watchers: { some: { userId } }, ...openFilter }; break;
        case 'overdueCount': where = {
          OR: [{ createdById: userId }, { assignedToId: userId }, { watchers: { some: { userId } } }],
          slaResolutionDeadline: { lt: new Date() }, ...openFilter,
        }; break;
        default: where = { createdById: userId };
      }
    }

    return this.prisma.ticket.findMany({
      where, orderBy: { updatedAt: 'desc' }, take: 20, include: includes,
    });
  }

  async archiveTicket(id: string, user: any) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return this.prisma.ticket.update({
      where: { id },
      data: { isArchived: true, archivedAt: new Date() },
    });
  }

  async unarchiveTicket(id: string, user: any) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return this.prisma.ticket.update({
      where: { id },
      data: { isArchived: false, archivedAt: null },
    });
  }

  // ==================== TIME ENTRIES ====================

  async getTimeEntries(ticketId: string) {
    return this.prisma.timeEntry.findMany({
      where: { ticketId },
      include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
      orderBy: { date: 'desc' },
    });
  }

  async addTimeEntry(ticketId: string, user: any, data: { minutes: number; description?: string }) {
    return this.prisma.timeEntry.create({
      data: {
        ticketId,
        userId: user.id,
        minutes: data.minutes,
        description: data.description || null,
      },
      include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
    });
  }

  async deleteTimeEntry(id: string, user: any) {
    const entry = await this.prisma.timeEntry.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException();
    if (entry.userId !== user.id && user.globalRole !== 'GLOBAL_ADMIN') throw new ForbiddenException();
    return this.prisma.timeEntry.delete({ where: { id } });
  }

  // ==================== TIMELINE ====================

  async getTimeline(ticketId: string) {
    const [history, messages, notes, forwards, timeEntries] = await Promise.all([
      this.prisma.ticketHistory.findMany({
        where: { ticketId },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.message.findMany({
        where: { ticketId },
        include: { author: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.internalNote.findMany({
        where: { ticketId },
        include: { author: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.ticketForward.findMany({
        where: { ticketId },
        include: {
          fromUser: { select: { id: true, firstName: true, lastName: true } },
          toUser: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.timeEntry.findMany({
        where: { ticketId },
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { date: 'asc' },
      }),
    ]);

    // Get user names for history changedById
    const userIds = [...new Set(history.filter(h => h.changedById).map(h => h.changedById!))];
    const users = userIds.length > 0
      ? await this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, firstName: true, lastName: true } })
      : [];
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    // Build unified timeline
    const events: any[] = [];

    for (const h of history) {
      events.push({
        type: 'change', field: h.field, oldValue: h.oldValue, newValue: h.newValue,
        user: h.changedById ? userMap[h.changedById] : null,
        timestamp: h.createdAt,
      });
    }

    for (const m of messages) {
      events.push({
        type: 'message', id: m.id, content: m.content, user: m.author,
        timestamp: m.createdAt, isEdited: m.isEdited,
      });
    }

    for (const n of notes) {
      events.push({
        type: 'note', id: n.id, content: n.content, user: n.author,
        timestamp: n.createdAt,
      });
    }

    for (const f of forwards) {
      events.push({
        type: 'forward', fromUser: f.fromUser, toUser: f.toUser, message: f.message,
        timestamp: f.createdAt,
      });
    }

    for (const t of timeEntries) {
      events.push({
        type: 'time', minutes: t.minutes, description: t.description, user: t.user,
        timestamp: t.date,
      });
    }

    // Sort by timestamp
    events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return events;
  }

  // ==================== BULK ACTIONS ====================

  async bulkUpdate(user: any, data: { ticketIds: string[]; action: string; value?: string }) {
    const { ticketIds, action, value } = data;
    if (!ticketIds?.length) return { updated: 0 };

    const results: string[] = [];

    for (const ticketId of ticketIds) {
      try {
        switch (action) {
          case 'close':
            await this.prisma.ticket.update({
              where: { id: ticketId },
              data: { status: 'CLOSED' as any, closedAt: new Date() },
            });
            results.push(ticketId);
            break;
          case 'archive':
            await this.prisma.ticket.update({
              where: { id: ticketId },
              data: { isArchived: true, archivedAt: new Date() },
            });
            results.push(ticketId);
            break;
          case 'unarchive':
            await this.prisma.ticket.update({
              where: { id: ticketId },
              data: { isArchived: false, archivedAt: null },
            });
            results.push(ticketId);
            break;
          case 'assign':
            if (value) {
              await this.prisma.ticket.update({
                where: { id: ticketId },
                data: { assignedToId: value },
              });
              results.push(ticketId);
            }
            break;
          case 'priority':
            if (value) {
              await this.prisma.ticket.update({
                where: { id: ticketId },
                data: { priority: value as any },
              });
              results.push(ticketId);
            }
            break;
          case 'status':
            if (value) {
              await this.prisma.ticket.update({
                where: { id: ticketId },
                data: { status: value as any, ...(value === 'CLOSED' ? { closedAt: new Date() } : {}) },
              });
              results.push(ticketId);
            }
            break;
          case 'delete':
            if (user.globalRole === 'GLOBAL_ADMIN') {
              await this.prisma.ticket.delete({ where: { id: ticketId } });
              results.push(ticketId);
            }
            break;
        }
      } catch (e) { /* skip failed */ }
    }

    return { updated: results.length, ticketIds: results };
  }
}