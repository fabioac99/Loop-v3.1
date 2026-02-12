import { Controller, Get, Post, Delete, Param, UseGuards, UseInterceptors, UploadedFile, Res, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import * as fs from 'fs';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
@ApiTags('Files')
@ApiBearerAuth()
@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private service: FilesService) {}
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  upload(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: any, @Query('ticketId') ticketId?: string, @Query('messageId') messageId?: string) {
    return this.service.create(file, user.id, ticketId, messageId);
  }
  @Get(':id')
  async download(@Param('id') id: string, @Res() res: Response) {
    const att = await this.service.findById(id);
    res.setHeader('Content-Type', att.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${att.originalName}"`);
    fs.createReadStream(att.path).pipe(res);
  }
  @Delete(':id')
  delete(@Param('id') id: string) { return this.service.delete(id); }
}
