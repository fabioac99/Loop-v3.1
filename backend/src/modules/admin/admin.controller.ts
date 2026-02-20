import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Admin')
@ApiBearerAuth('access-token')
@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private service: AdminService) {}

  // ==================== PERMISSIONS ====================

  @Get('permissions')
  @UseGuards(RolesGuard) @Roles('GLOBAL_ADMIN')
  getAllPermissions() { return this.service.getAllPermissions(); }

  @Get('permissions/user/:userId')
  @UseGuards(RolesGuard) @Roles('GLOBAL_ADMIN')
  getUserPermissions(@Param('userId') userId: string) { return this.service.getUserPermissions(userId); }

  @Put('permissions/user/:userId')
  @UseGuards(RolesGuard) @Roles('GLOBAL_ADMIN')
  setUserPermissions(@Param('userId') userId: string, @Body() body: { permissions: string[] }) {
    return this.service.setUserPermissions(userId, body.permissions);
  }

  @Get('permissions/check/:permission')
  checkPermission(@CurrentUser() user: any, @Param('permission') permission: string) {
    return this.service.userHasPermission(user.id, permission).then(has => ({ has }));
  }

  @Get('permissions/my')
  getMyPermissions(@CurrentUser() user: any) { return this.service.getUserPermissions(user.id); }

  // ==================== CUSTOM STATUSES ====================

  @Get('statuses')
  getStatuses() { return this.service.getStatuses(); }

  @Post('statuses')
  @UseGuards(RolesGuard) @Roles('GLOBAL_ADMIN')
  createStatus(@Body() body: any) { return this.service.createStatus(body); }

  @Put('statuses/:id')
  @UseGuards(RolesGuard) @Roles('GLOBAL_ADMIN')
  updateStatus(@Param('id') id: string, @Body() body: any) { return this.service.updateStatus(id, body); }

  @Delete('statuses/:id')
  @UseGuards(RolesGuard) @Roles('GLOBAL_ADMIN')
  deleteStatus(@Param('id') id: string) { return this.service.deleteStatus(id); }

  // ==================== CUSTOM PRIORITIES ====================

  @Get('priorities')
  getPriorities() { return this.service.getPriorities(); }

  @Post('priorities')
  @UseGuards(RolesGuard) @Roles('GLOBAL_ADMIN')
  createPriority(@Body() body: any) { return this.service.createPriority(body); }

  @Put('priorities/:id')
  @UseGuards(RolesGuard) @Roles('GLOBAL_ADMIN')
  updatePriority(@Param('id') id: string, @Body() body: any) { return this.service.updatePriority(id, body); }

  @Delete('priorities/:id')
  @UseGuards(RolesGuard) @Roles('GLOBAL_ADMIN')
  deletePriority(@Param('id') id: string) { return this.service.deletePriority(id); }

  // ==================== TICKET DELETION ====================

  @Delete('tickets/:id')
  deleteTicket(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.deleteTicket(id, user.id);
  }

  // ==================== TICKET FORWARDING ====================

  @Post('tickets/:id/forward')
  forwardTicket(@Param('id') id: string, @CurrentUser() user: any, @Body() body: { toUserId: string; message?: string }) {
    return this.service.forwardTicket(id, user.id, body.toUserId, body.message);
  }

  @Get('tickets/:id/forwards')
  getForwards(@Param('id') id: string) { return this.service.getForwards(id); }
}
