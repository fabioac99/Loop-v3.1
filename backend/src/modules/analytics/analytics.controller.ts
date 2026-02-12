import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('GLOBAL_ADMIN', 'DEPARTMENT_HEAD')
export class AnalyticsController {
  constructor(private service: AnalyticsService) {}

  @Get()
  getOverview(@CurrentUser() user: any, @Query() query: any) {
    return this.service.getOverview(user, query);
  }

  @Get('export')
  @Roles('GLOBAL_ADMIN')
  exportData(@Query() query: any) {
    return this.service.exportData(query);
  }
}
