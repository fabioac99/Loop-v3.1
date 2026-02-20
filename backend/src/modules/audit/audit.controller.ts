import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../auth/guards/permissions.guard';

@ApiTags('Audit')
@ApiBearerAuth('access-token')
@Controller('audit')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('audit.view')
export class AuditController {
  constructor(private service: AuditService) {}
  @Get()
  findAll(@Query() query: any) { return this.service.findAll(query); }
}
