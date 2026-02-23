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

    const openFilter = { status: { notIn: ['CLOSED', 'REJECTED'] as any } };
    const ticketIncludes = {
      fromDepartment: { select: { name: true, color: true } },
      toDepartment: { select: { name: true, color: true } },
      createdBy: { select: { firstName: true, lastName: true } },
    };

    // ---- Personal view (everyone gets this) ----
    const personalFilter = {
      OR: [
        { createdById: userId },
        { assignedToId: userId },
        { watchers: { some: { userId } } },
      ],
    };

    const [myOpen, assignedToMe, watchingCount, personalRecent, personalByStatus, personalByPriority, personalOverdue] = await Promise.all([
      this.prisma.ticket.count({ where: { createdById: userId, ...openFilter } }),
      this.prisma.ticket.count({ where: { assignedToId: userId, ...openFilter } }),
      this.prisma.ticket.count({ where: { watchers: { some: { userId } }, ...openFilter } }),
      this.prisma.ticket.findMany({
        where: personalFilter, orderBy: { updatedAt: 'desc' }, take: 10, include: ticketIncludes,
      }),
      this.prisma.ticket.groupBy({ by: ['status'], _count: true, where: personalFilter }),
      this.prisma.ticket.groupBy({ by: ['priority'], _count: true, where: personalFilter }),
      this.prisma.ticket.count({ where: { slaResolutionDeadline: { lt: new Date() }, ...openFilter, ...personalFilter } }),
    ]);

    const personal = {
      myOpen, assignedToMe, watchingCount, overdueCount: personalOverdue,
      recentlyUpdated: personalRecent, byStatus: personalByStatus, byPriority: personalByPriority,
    };

    // ---- Department view (dept heads & admins only) ----
    let department: any = null;
    if ((isDeptHead || isAdmin) && deptId) {
      const deptFilter = isAdmin ? {} : {
        OR: [{ toDepartmentId: deptId }, { fromDepartmentId: deptId }],
      };

      const [deptTotal, deptOpen, deptWaiting, deptOverdue, deptRecent, deptByStatus, deptByPriority, deptUnassigned] = await Promise.all([
        this.prisma.ticket.count({ where: deptFilter }),
        this.prisma.ticket.count({ where: { ...deptFilter, ...openFilter } }),
        this.prisma.ticket.count({ where: { ...deptFilter, status: 'WAITING_REPLY' as any } }),
        this.prisma.ticket.count({ where: { ...deptFilter, slaResolutionDeadline: { lt: new Date() }, ...openFilter } }),
        this.prisma.ticket.findMany({
          where: deptFilter, orderBy: { updatedAt: 'desc' }, take: 10, include: ticketIncludes,
        }),
        this.prisma.ticket.groupBy({ by: ['status'], _count: true, where: deptFilter }),
        this.prisma.ticket.groupBy({ by: ['priority'], _count: true, where: deptFilter }),
        this.prisma.ticket.count({ where: { ...deptFilter, assignedToId: null, ...openFilter } }),
      ]);

      department = {
        totalTickets: deptTotal, openTickets: deptOpen, waitingReply: deptWaiting,
        overdueCount: deptOverdue, unassigned: deptUnassigned,
        recentlyUpdated: deptRecent, byStatus: deptByStatus, byPriority: deptByPriority,
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
}