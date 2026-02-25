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
  constructor(private service: TicketsService) { }

  @Get()
  findAll(@CurrentUser() user: any, @Query() query: any) {
    return this.service.findAll(user, query);
  }

  @Get('dashboard')
  getDashboard(@CurrentUser() user: any) {
    return this.service.getDashboard(user);
  }

  @Get('dashboard/kpi/:type')
  getKpiTickets(@CurrentUser() user: any, @Param('type') type: string, @Query('scope') scope?: string) {
    return this.service.getKpiTickets(user, type, scope || 'personal');
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

  @Post(':id/archive')
  archiveTicket(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.archiveTicket(id, user);
  }

  @Post(':id/unarchive')
  unarchiveTicket(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.unarchiveTicket(id, user);
  }

  // Time entries
  @Get(':id/time-entries')
  getTimeEntries(@Param('id') id: string) {
    return this.service.getTimeEntries(id);
  }

  @Post(':id/time-entries')
  addTimeEntry(@Param('id') id: string, @CurrentUser() user: any, @Body() body: { minutes: number; description?: string }) {
    return this.service.addTimeEntry(id, user, body);
  }

  @Delete('time-entries/:entryId')
  deleteTimeEntry(@Param('entryId') id: string, @CurrentUser() user: any) {
    return this.service.deleteTimeEntry(id, user);
  }

  // Timeline
  @Get(':id/timeline')
  getTimeline(@Param('id') id: string) {
    return this.service.getTimeline(id);
  }

  // Bulk actions
  @Post('bulk/update')
  bulkUpdate(@CurrentUser() user: any, @Body() body: { ticketIds: string[]; action: string; value?: string }) {
    return this.service.bulkUpdate(user, body);
  }

  // Pause / Resume
  @Post(':id/pause')
  pauseTicket(@Param('id') id: string, @CurrentUser() user: any, @Body() body: { reason: string }) {
    return this.service.pauseTicket(id, user, body.reason);
  }

  @Post(':id/resume')
  resumeTicket(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.resumeTicket(id, user);
  }

  // Pause Reasons
  @Get('pause-reasons/list')
  getPauseReasons() { return this.service.getPauseReasons(); }

  @Get('pause-reasons/all')
  getAllPauseReasons() { return this.service.getAllPauseReasons(); }

  @Post('pause-reasons')
  createPauseReason(@Body() body: { label: string; sortOrder?: number }) { return this.service.createPauseReason(body); }

  @Put('pause-reasons/:rid')
  updatePauseReason(@Param('rid') rid: string, @Body() body: any) { return this.service.updatePauseReason(rid, body); }

  @Delete('pause-reasons/:rid')
  deletePauseReason(@Param('rid') rid: string) { return this.service.deletePauseReason(rid); }

  // Merge tickets
  @Post(':id/merge')
  mergeTickets(@Param('id') id: string, @CurrentUser() user: any, @Body() body: { sourceIds: string[] }) {
    return this.service.mergeTickets(id, body.sourceIds, user);
  }
}