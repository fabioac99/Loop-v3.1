import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private service: NotificationsService) {}

  @Get()
  getNotifications(@CurrentUser() user: any, @Query('unreadOnly') unreadOnly?: boolean, @Query('page') page?: number) {
    return this.service.getForUser(user.id, { unreadOnly, page });
  }

  @Patch(':id/read')
  markAsRead(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.markAsRead(user.id, id);
  }

  @Post('read-all')
  markAllAsRead(@CurrentUser() user: any) {
    return this.service.markAllAsRead(user.id);
  }

  @Get('preferences')
  getPreferences(@CurrentUser() user: any) {
    return this.service.getPreferences(user.id);
  }

  @Post('preferences')
  updatePreferences(@CurrentUser() user: any, @Body() body: { preferences: any[] }) {
    return this.service.updatePreferences(user.id, body.preferences);
  }
}
