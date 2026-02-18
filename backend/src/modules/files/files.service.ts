import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { unlinkSync } from 'fs';

@Injectable()
export class FilesService {
  constructor(private prisma: PrismaService) {}

  async create(file: Express.Multer.File, userId: string, ticketId?: string | null, messageId?: string | null) {
    return this.prisma.attachment.create({
      data: {
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: file.path,
        uploadedById: userId,
        ticketId: ticketId || null,
        messageId: messageId || null,
      },
    });
  }

  async findById(id: string) {
    const att = await this.prisma.attachment.findUnique({ where: { id } });
    if (!att) throw new NotFoundException('Attachment not found');
    return att;
  }

  async linkToTicket(attachmentIds: string[], ticketId: string) {
    if (!attachmentIds?.length) return;
    await this.prisma.attachment.updateMany({
      where: { id: { in: attachmentIds } },
      data: { ticketId },
    });
  }

  async linkToMessage(attachmentIds: string[], messageId: string) {
    if (!attachmentIds?.length) return;
    await this.prisma.attachment.updateMany({
      where: { id: { in: attachmentIds } },
      data: { messageId },
    });
  }

  async delete(id: string) {
    const att = await this.prisma.attachment.findUnique({ where: { id } });
    if (!att) throw new NotFoundException();
    try { unlinkSync(att.path); } catch {}
    return this.prisma.attachment.delete({ where: { id } });
  }
}
