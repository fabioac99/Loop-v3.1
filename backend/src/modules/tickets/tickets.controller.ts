import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Tickets')
@ApiBearerAuth('access-token')
@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(private service: TicketsService) {}

  @Get()
  findAll(@CurrentUser() user: any, @Query() query: any) {
    return this.service.findAll(user, query);
  }

  @Get('dashboard')
  getDashboard(@CurrentUser() user: any) {
    return this.service.getDashboard(user);
  }

  @Get(':id')
  findById(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.findById(id, user);
  }

  @Post()
  create(@CurrentUser() user: any, @Body() body: any) {
    return this.service.create(user, body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @CurrentUser() user: any, @Body() body: any) {
    return this.service.update(id, user, body);
  }

  @Post(':id/messages')
  addMessage(@Param('id') id: string, @CurrentUser() user: any, @Body() body: { content: string; mentions?: string[] }) {
    return this.service.addMessage(id, user, body);
  }

  @Patch('messages/:messageId')
  editMessage(@Param('messageId') id: string, @CurrentUser() user: any, @Body() body: { content: string }) {
    return this.service.editMessage(id, user, body.content);
  }

  @Delete('messages/:messageId')
  deleteMessage(@Param('messageId') id: string, @CurrentUser() user: any) {
    return this.service.deleteMessage(id, user);
  }

  @Post(':id/notes')
  addNote(@Param('id') id: string, @CurrentUser() user: any, @Body() body: { content: string }) {
    return this.service.addInternalNote(id, user, body.content);
  }

  @Post(':id/watchers')
  addWatcher(@Param('id') id: string, @Body() body: { userId: string }) {
    return this.service.addWatcher(id, body.userId);
  }

  @Delete(':id/watchers/:userId')
  removeWatcher(@Param('id') id: string, @Param('userId') userId: string) {
    return this.service.removeWatcher(id, userId);
  }

  @Post(':id/duplicate')
  duplicate(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.duplicate(id, user);
  }

  @Post(':id/actions/:action')
  executeAction(@Param('id') id: string, @Param('action') action: string, @CurrentUser() user: any) {
    return this.service.executeAction(id, user, action);
  }
}
