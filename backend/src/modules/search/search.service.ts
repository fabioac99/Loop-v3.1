import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}
  async search(query: string, user: any) {
    const q = `%${query}%`;
    const tickets = await this.prisma.ticket.findMany({
      where: {
        OR: [
          { ticketNumber: { contains: query, mode: 'insensitive' } },
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
        ...(user.globalRole !== 'GLOBAL_ADMIN' ? {
          AND: { OR: [{ createdById: user.id }, { assignedToId: user.id }, { toDepartmentId: user.departmentId }, { fromDepartmentId: user.departmentId }] }
        } : {}),
      },
      select: { id: true, ticketNumber: true, title: true, status: true, priority: true, createdAt: true },
      take: 20, orderBy: { updatedAt: 'desc' },
    });
    const users = await this.prisma.user.findMany({
      where: { OR: [{ firstName: { contains: query, mode: 'insensitive' } }, { lastName: { contains: query, mode: 'insensitive' } }, { email: { contains: query, mode: 'insensitive' } }], isActive: true },
      select: { id: true, firstName: true, lastName: true, email: true, avatar: true, departmentId: true },
      take: 10,
    });
    const departments = await this.prisma.department.findMany({
      where: { name: { contains: query, mode: 'insensitive' }, isActive: true },
      select: { id: true, name: true, slug: true, color: true },
      take: 5,
    });
    return { tickets, users, departments };
  }
}
