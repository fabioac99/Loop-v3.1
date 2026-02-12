import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
@Injectable()
export class FilesService {
  constructor(private prisma: PrismaService) {}
  async create(file: Express.Multer.File, userId: string, ticketId?: string, messageId?: string) {
    return this.prisma.attachment.create({
      data: {
        filename: file.filename, originalName: file.originalname,
        mimeType: file.mimetype, size: file.size, path: file.path,
        uploadedById: userId, ticketId, messageId,
      },
    });
  }
  async findById(id: string) {
    const att = await this.prisma.attachment.findUnique({ where: { id } });
    if (!att) throw new NotFoundException();
    return att;
  }
  async delete(id: string) {
    const att = await this.prisma.attachment.findUnique({ where: { id } });
    if (!att) throw new NotFoundException();
    try { fs.unlinkSync(att.path); } catch {}
    return this.prisma.attachment.delete({ where: { id } });
  }
}
