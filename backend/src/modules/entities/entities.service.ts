import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EntitiesService {
  constructor(private prisma: PrismaService) {}

  // ---- CLIENTS ----
  async getClients(params: { search?: string; page?: number; limit?: number }) {
    const page = parseInt(String(params.page), 10) || 1;
    const limit = parseInt(String(params.limit), 10) || 50;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE is_active = true';
    const queryParams: any[] = [];

    if (params.search) {
      queryParams.push(`%${params.search}%`);
      const idx = queryParams.length;
      whereClause += ` AND (name ILIKE $${idx} OR code ILIKE $${idx} OR email ILIKE $${idx})`;
    }

    const countResult: any[] = await this.prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int as count FROM clients ${whereClause}`, ...queryParams
    );
    const total = countResult[0]?.count || 0;

    queryParams.push(limit, offset);
    const data = await this.prisma.$queryRawUnsafe(
      `SELECT * FROM clients ${whereClause} ORDER BY name ASC LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`,
      ...queryParams
    );

    return { data, total, page, limit };
  }

  async getClient(id: string) {
    const results: any[] = await this.prisma.$queryRawUnsafe(
      'SELECT * FROM clients WHERE id = $1', id
    );
    if (!results.length) throw new NotFoundException('Client not found');
    return results[0];
  }

  async createClient(data: any) {
    const results: any[] = await this.prisma.$queryRawUnsafe(
      `INSERT INTO clients (id, name, code, email, phone, address, tax_id, notes)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      data.name, data.code || null, data.email || null, data.phone || null,
      data.address || null, data.taxId || null, data.notes || null
    );
    return results[0];
  }

  async updateClient(id: string, data: any) {
    const results: any[] = await this.prisma.$queryRawUnsafe(
      `UPDATE clients SET name = COALESCE($2, name), code = $3, email = $4,
       phone = $5, address = $6, tax_id = $7, notes = $8, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      id, data.name, data.code || null, data.email || null, data.phone || null,
      data.address || null, data.taxId || null, data.notes || null
    );
    if (!results.length) throw new NotFoundException('Client not found');
    return results[0];
  }

  async deleteClient(id: string) {
    await this.prisma.$queryRawUnsafe(
      'UPDATE clients SET is_active = false, updated_at = NOW() WHERE id = $1', id
    );
    return { success: true };
  }

  async getAllClients() {
    return this.prisma.$queryRawUnsafe(
      'SELECT id, name, code FROM clients WHERE is_active = true ORDER BY name ASC'
    );
  }

  // ---- SUPPLIERS ----
  async getSuppliers(params: { search?: string; page?: number; limit?: number }) {
    const page = parseInt(String(params.page), 10) || 1;
    const limit = parseInt(String(params.limit), 10) || 50;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE is_active = true';
    const queryParams: any[] = [];

    if (params.search) {
      queryParams.push(`%${params.search}%`);
      const idx = queryParams.length;
      whereClause += ` AND (name ILIKE $${idx} OR code ILIKE $${idx} OR email ILIKE $${idx})`;
    }

    const countResult: any[] = await this.prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int as count FROM suppliers ${whereClause}`, ...queryParams
    );
    const total = countResult[0]?.count || 0;

    queryParams.push(limit, offset);
    const data = await this.prisma.$queryRawUnsafe(
      `SELECT * FROM suppliers ${whereClause} ORDER BY name ASC LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`,
      ...queryParams
    );

    return { data, total, page, limit };
  }

  async getSupplier(id: string) {
    const results: any[] = await this.prisma.$queryRawUnsafe(
      'SELECT * FROM suppliers WHERE id = $1', id
    );
    if (!results.length) throw new NotFoundException('Supplier not found');
    return results[0];
  }

  async createSupplier(data: any) {
    const results: any[] = await this.prisma.$queryRawUnsafe(
      `INSERT INTO suppliers (id, name, code, email, phone, address, tax_id, notes)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      data.name, data.code || null, data.email || null, data.phone || null,
      data.address || null, data.taxId || null, data.notes || null
    );
    return results[0];
  }

  async updateSupplier(id: string, data: any) {
    const results: any[] = await this.prisma.$queryRawUnsafe(
      `UPDATE suppliers SET name = COALESCE($2, name), code = $3, email = $4,
       phone = $5, address = $6, tax_id = $7, notes = $8, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      id, data.name, data.code || null, data.email || null, data.phone || null,
      data.address || null, data.taxId || null, data.notes || null
    );
    if (!results.length) throw new NotFoundException('Supplier not found');
    return results[0];
  }

  async deleteSupplier(id: string) {
    await this.prisma.$queryRawUnsafe(
      'UPDATE suppliers SET is_active = false, updated_at = NOW() WHERE id = $1', id
    );
    return { success: true };
  }

  async getAllSuppliers() {
    return this.prisma.$queryRawUnsafe(
      'SELECT id, name, code FROM suppliers WHERE is_active = true ORDER BY name ASC'
    );
  }
}
