import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
@ApiTags('Settings')
@ApiBearerAuth('access-token')
@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('GLOBAL_ADMIN')
export class SettingsController {
  constructor(private service: SettingsService) {}
  @Get()
  getAll() { return this.service.getAll(); }
  @Get(':key')
  get(@Param('key') key: string) { return this.service.get(key); }
  @Put()
  setMany(@Body() body: Record<string, any>) { return this.service.setMany(body); }
}
