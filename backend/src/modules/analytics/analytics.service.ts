import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getOverview(user: any, params: { departmentId?: string; dateFrom?: string; dateTo?: string }) {
    const where: any = {};
    if (params.departmentId) where.toDepartmentId = params.departmentId;
    if (user.globalRole !== 'GLOBAL_ADMIN' && user.departmentRole === 'DEPARTMENT_HEAD') {
      where.OR = [{ toDepartmentId: user.departmentId }, { fromDepartmentId: user.departmentId }];
    }
    if (params.dateFrom) where.createdAt = { ...where.createdAt, gte: new Date(params.dateFrom) };
    if (params.dateTo) where.createdAt = { ...where.createdAt, lte: new Date(params.dateTo) };

    const [total, byStatus, byPriority, byDepartment, overdue, avgResolution] = await Promise.all([
      this.prisma.ticket.count({ where }),
      this.prisma.ticket.groupBy({ by: ['status'], _count: true, where }),
      this.prisma.ticket.groupBy({ by: ['priority'], _count: true, where }),
      this.prisma.ticket.groupBy({ by: ['toDepartmentId'], _count: true, where }),
      this.prisma.ticket.count({ where: { ...where, slaResolutionDeadline: { lt: new Date() }, status: { notIn: ['CLOSED', 'REJECTED'] } } }),
      this.prisma.ticket.aggregate({
        where: { ...where, closedAt: { not: null } },
        _avg: { slaPausedDuration: true },
      }),
    ]);

    // Get department names
    const depts = await this.prisma.department.findMany({ select: { id: true, name: true, color: true } });
    const deptMap = Object.fromEntries(depts.map(d => [d.id, d]));

    const ticketsPerDept = byDepartment.map((d: any) => ({
      departmentId: d.toDepartmentId,
      department: deptMap[d.toDepartmentId],
      count: d._count,
    }));

    // Monthly tickets (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const monthlyRaw = await this.prisma.$queryRaw`
      SELECT date_trunc('month', created_at) as month, COUNT(*)::int as count
      FROM tickets WHERE created_at >= ${twelveMonthsAgo}
      GROUP BY month ORDER BY month ASC
    ` as any[];

    // Most active users
    const activeUsers = await this.prisma.ticket.groupBy({
      by: ['createdById'], _count: true, where,
      orderBy: { _count: { createdById: 'desc' } }, take: 10,
    });

    return {
      total, byStatus, byPriority, ticketsPerDept, overdue,
      monthlyTickets: monthlyRaw,
      activeUsers,
      overdueRate: total > 0 ? ((overdue / total) * 100).toFixed(1) : '0',
    };
  }

  async exportData(params: { format: 'csv' | 'excel'; departmentId?: string; dateFrom?: string; dateTo?: string }) {
    const where: any = {};
    if (params.departmentId) where.toDepartmentId = params.departmentId;
    if (params.dateFrom) where.createdAt = { gte: new Date(params.dateFrom) };
    if (params.dateTo) where.createdAt = { ...where.createdAt, lte: new Date(params.dateTo) };

    const tickets = await this.prisma.ticket.findMany({
      where,
      include: { fromDepartment: true, toDepartment: true, createdBy: true, assignedTo: true },
      orderBy: { createdAt: 'desc' },
    });

    return tickets.map(t => ({
      ticketNumber: t.ticketNumber,
      title: t.title,
      status: t.status,
      priority: t.priority,
      fromDepartment: t.fromDepartment.name,
      toDepartment: t.toDepartment.name,
      createdBy: `${t.createdBy.firstName} ${t.createdBy.lastName}`,
      assignedTo: t.assignedTo ? `${t.assignedTo.firstName} ${t.assignedTo.lastName}` : '',
      createdAt: t.createdAt.toISOString(),
      closedAt: t.closedAt?.toISOString() || '',
    }));
  }
}
