import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../auth/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Analytics')
@ApiBearerAuth('access-token')
@Controller('analytics')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('analytics.view')
export class AnalyticsController {
  constructor(private service: AnalyticsService) {}

  @Get()
  getOverview(@CurrentUser() user: any, @Query() query: any) {
    return this.service.getOverview(user, query);
  }

  @Get('export')
  exportData(@Query() query: any) {
    return this.service.exportData(query);
  }
}
