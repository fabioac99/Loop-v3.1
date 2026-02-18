import { Controller, Get, Post, Delete, Param, UseGuards, UseInterceptors, UploadedFile, Res, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, createReadStream, mkdirSync } from 'fs';
import { v4 as uuid } from 'uuid';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

const uploadDir = process.env.UPLOAD_DIR || './uploads';
// Ensure uploads directory exists
try { mkdirSync(uploadDir, { recursive: true }); } catch {}

const storage = diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname);
    cb(null, `${uuid()}${ext}`);
  },
});

@ApiTags('Files')
@Controller('files')
export class FilesController {
  constructor(private service: FilesService) {}

  @Post('upload')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', { storage, limits: { fileSize: 50 * 1024 * 1024 } }))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
    @Query('ticketId') ticketId?: string,
    @Query('messageId') messageId?: string,
  ) {
    return this.service.create(file, user.id, ticketId || null, messageId || null);
  }

  // PUBLIC endpoint - no auth so <img src="..."> works in browser
  @Get(':id')
  async download(@Param('id') id: string, @Res() res: Response) {
    try {
      const att = await this.service.findById(id);
      if (!existsSync(att.path)) {
        res.status(404).json({ message: 'File not found on disk' });
        return;
      }
      if (att.mimeType.startsWith('image/')) {
        res.setHeader('Cache-Control', 'public, max-age=3600');
      }
      res.setHeader('Content-Type', att.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${att.originalName}"`);
      res.setHeader('Content-Length', String(att.size));
      createReadStream(att.path).pipe(res);
    } catch {
      res.status(404).json({ message: 'File not found' });
    }
  }

  @Get(':id/download')
  async downloadAttachment(@Param('id') id: string, @Res() res: Response) {
    try {
      const att = await this.service.findById(id);
      if (!existsSync(att.path)) {
        res.status(404).json({ message: 'File not found on disk' });
        return;
      }
      res.setHeader('Content-Type', att.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${att.originalName}"`);
      res.setHeader('Content-Length', String(att.size));
      createReadStream(att.path).pipe(res);
    } catch {
      res.status(404).json({ message: 'File not found' });
    }
  }

  @Delete(':id')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
