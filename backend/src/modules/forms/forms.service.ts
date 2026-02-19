import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FormsService {
  constructor(private prisma: PrismaService) {}

  // ---- Request Categories ----
  async getCategories(departmentId?: string) {
    const where: any = { isActive: true };
    if (departmentId) where.departmentId = departmentId;
    return this.prisma.requestCategory.findMany({
      where, include: { subtypes: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } }, department: { select: { id: true, name: true, slug: true } } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createCategory(data: { name: string; slug: string; departmentId: string; description?: string; icon?: string }) {
    return this.prisma.requestCategory.create({ data });
  }

  async updateCategory(id: string, data: any) {
    return this.prisma.requestCategory.update({ where: { id }, data });
  }

  async deleteCategory(id: string) {
    return this.prisma.requestCategory.update({ where: { id }, data: { isActive: false } });
  }

  // ---- Request Subtypes ----
  async getSubtypes(categoryId: string) {
    return this.prisma.requestSubtype.findMany({
      where: { categoryId, isActive: true },
      include: { formSchema: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getSubtype(id: string) {
    const st = await this.prisma.requestSubtype.findUnique({
      where: { id }, include: { formSchema: true, category: { include: { department: true } } },
    });
    if (!st) throw new NotFoundException();
    return st;
  }

  async createSubtype(data: any) {
    return this.prisma.requestSubtype.create({ data });
  }

  async updateSubtype(id: string, data: any) {
    return this.prisma.requestSubtype.update({ where: { id }, data });
  }

  async deleteSubtype(id: string) {
    return this.prisma.requestSubtype.update({ where: { id }, data: { isActive: false } });
  }

  // ---- Form Schemas ----
  async getSchemas() {
    return this.prisma.formSchema.findMany({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
  }

  async getSchema(id: string) {
    const schema = await this.prisma.formSchema.findUnique({ where: { id } });
    if (!schema) throw new NotFoundException();
    return schema;
  }

  async createSchema(data: { name: string; description?: string; schema: any }) {
    return this.prisma.formSchema.create({ data });
  }

  async updateSchema(id: string, data: any) {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.schema !== undefined) {
      updateData.schema = data.schema;
      updateData.version = { increment: 1 };
    }
    return this.prisma.formSchema.update({ where: { id }, data: updateData });
  }

  async deleteSchema(id: string) {
    return this.prisma.formSchema.update({ where: { id }, data: { isActive: false } });
  }

  // ---- Get full hierarchy for a department ----
  async getHierarchy(departmentId: string) {
    return this.prisma.requestCategory.findMany({
      where: { departmentId, isActive: true },
      include: {
        subtypes: {
          where: { isActive: true },
          include: { formSchema: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }
}
