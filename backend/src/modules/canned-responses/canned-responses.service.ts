import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CannedResponsesService {
  constructor(private prisma: PrismaService) {}

  async findAll(user: any) {
    const isAdmin = user.globalRole === 'GLOBAL_ADMIN';
    return this.prisma.cannedResponse.findMany({
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
        department: { select: { id: true, name: true } },
      },
      orderBy: [{ usageCount: 'desc' }, { title: 'asc' }],
    });
  }

  async create(user: any, data: any) {
    return this.prisma.cannedResponse.create({
      data: {
        title: data.title,
        content: data.content,
        category: data.category || null,
        shortcut: data.shortcut || null,
        departmentId: data.departmentId || null,
        createdById: user.id,
        isGlobal: data.isGlobal || false,
      },
    });
  }

  async update(id: string, user: any, data: any) {
    const cr = await this.prisma.cannedResponse.findUnique({ where: { id } });
    if (!cr) throw new NotFoundException();
    if (cr.createdById !== user.id && user.globalRole !== 'GLOBAL_ADMIN') throw new ForbiddenException();
    return this.prisma.cannedResponse.update({
      where: { id },
      data: {
        title: data.title,
        content: data.content,
        category: data.category || null,
        shortcut: data.shortcut || null,
        departmentId: data.departmentId || null,
        isGlobal: data.isGlobal ?? cr.isGlobal,
      },
    });
  }

  async delete(id: string, user: any) {
    const cr = await this.prisma.cannedResponse.findUnique({ where: { id } });
    if (!cr) throw new NotFoundException();
    if (cr.createdById !== user.id && user.globalRole !== 'GLOBAL_ADMIN') throw new ForbiddenException();
    return this.prisma.cannedResponse.delete({ where: { id } });
  }

  async incrementUsage(id: string) {
    return this.prisma.cannedResponse.update({
      where: { id },
      data: { usageCount: { increment: 1 } },
    });
  }
}
