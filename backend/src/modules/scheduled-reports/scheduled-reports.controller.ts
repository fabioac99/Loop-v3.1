import { Controller, Get, Put, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ScheduledReportsService } from './scheduled-reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Reports')
@ApiBearerAuth('access-token')
@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ScheduledReportsController {
  constructor(private service: ScheduledReportsService) { }

  // Config management (admin)
  @Get('configs')
  getConfigs() { return this.service.getConfigs(); }

  @Put('configs/:id')
  updateConfig(@Param('id') id: string, @Body() body: any) { return this.service.updateConfig(id, body); }

  // Snapshots (reports page)
  @Get('snapshots')
  getSnapshots(@CurrentUser() user: any, @Query('type') type?: string, @Query('limit') limit?: string) {
    return this.service.getSnapshots(user, type, limit ? parseInt(limit) : 30);
  }

  @Get('snapshots/:id')
  getSnapshot(@Param('id') id: string) { return this.service.getSnapshotFull(id); }

  // Manual trigger
  @Post('generate')
  generate(@CurrentUser() user: any, @Query('type') type: string) {
    return this.service.sendReportNow(user.id, type);
  }
}