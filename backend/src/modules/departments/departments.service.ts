import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.department.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { users: true, toTickets: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const dept = await this.prisma.department.findUnique({
      where: { id },
      include: {
        users: {
          where: { isActive: true },
          select: { id: true, firstName: true, lastName: true, email: true, departmentRole: true, avatar: true },
        },
        requestCategories: {
          include: { subtypes: true },
        },
        _count: { select: { users: true, toTickets: true, fromTickets: true } },
      },
    });
    if (!dept) throw new NotFoundException('Department not found');
    return dept;
  }

  async create(data: { name: string; slug: string; description?: string; color?: string; icon?: string }) {
    const exists = await this.prisma.department.findFirst({
      where: { OR: [{ name: data.name }, { slug: data.slug }] },
    });
    if (exists) throw new ConflictException('Department name or slug already exists');

    return this.prisma.department.create({ data });
  }

  async update(id: string, data: any) {
    return this.prisma.department.update({ where: { id }, data });
  }

  async delete(id: string) {
    return this.prisma.department.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
