import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TicketTemplatesService {
  constructor(private prisma: PrismaService) {}

  async findAll(user: any) {
    const isAdmin = user.globalRole === 'GLOBAL_ADMIN';
    return this.prisma.ticketTemplate.findMany({
      where: {
        OR: [
          { isGlobal: true },
          { createdById: user.id },
          ...(user.departmentId ? [{ departmentId: user.departmentId }] : []),
          ...(isAdmin ? [{}] : []),
        ],
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ usageCount: 'desc' }, { name: 'asc' }],
    });
  }

  async create(user: any, data: any) {
    return this.prisma.ticketTemplate.create({
      data: {
        name: data.name,
        description: data.description || null,
        title: data.title || null,
        content: data.content || null,
        categoryId: data.categoryId || null,
        subtypeId: data.subtypeId || null,
        toDepartmentId: data.toDepartmentId || null,
        priority: data.priority || 'NORMAL',
        isGlobal: data.isGlobal || false,
        departmentId: data.departmentId || null,
        createdById: user.id,
      },
    });
  }

  async update(id: string, user: any, data: any) {
    const t = await this.prisma.ticketTemplate.findUnique({ where: { id } });
    if (!t) throw new NotFoundException();
    if (t.createdById !== user.id && user.globalRole !== 'GLOBAL_ADMIN') throw new ForbiddenException();
    return this.prisma.ticketTemplate.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description || null,
        title: data.title || null,
        content: data.content || null,
        categoryId: data.categoryId || null,
        subtypeId: data.subtypeId || null,
        toDepartmentId: data.toDepartmentId || null,
        priority: data.priority || 'NORMAL',
        isGlobal: data.isGlobal ?? t.isGlobal,
        departmentId: data.departmentId || null,
      },
    });
  }

  async delete(id: string, user: any) {
    const t = await this.prisma.ticketTemplate.findUnique({ where: { id } });
    if (!t) throw new NotFoundException();
    if (t.createdById !== user.id && user.globalRole !== 'GLOBAL_ADMIN') throw new ForbiddenException();
    return this.prisma.ticketTemplate.delete({ where: { id } });
  }

  async incrementUsage(id: string) {
    return this.prisma.ticketTemplate.update({
      where: { id },
      data: { usageCount: { increment: 1 } },
    });
  }
}
