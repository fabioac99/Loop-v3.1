import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CannedResponsesService } from './canned-responses.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Canned Responses')
@ApiBearerAuth('access-token')
@Controller('canned-responses')
@UseGuards(JwtAuthGuard)
export class CannedResponsesController {
  constructor(private service: CannedResponsesService) { }

  @Get()
  findAll(@CurrentUser() user: any) { return this.service.findAll(user); }

  @Post()
  create(@CurrentUser() user: any, @Body() body: any) { return this.service.create(user, body); }

  @Put(':id')
  update(@Param('id') id: string, @CurrentUser() user: any, @Body() body: any) { return this.service.update(id, user, body); }

  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser() user: any) { return this.service.delete(id, user); }

  @Post(':id/use')
  incrementUsage(@Param('id') id: string) { return this.service.incrementUsage(id); }
}
