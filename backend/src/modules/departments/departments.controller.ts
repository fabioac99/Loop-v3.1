import {
  Controller, Get, Post, Put, Delete, Body, Param, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DepartmentsService } from './departments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../auth/guards/permissions.guard';

@ApiTags('Departments')
@ApiBearerAuth('access-token')
@Controller('departments')
@UseGuards(JwtAuthGuard)
export class DepartmentsController {
  constructor(private service: DepartmentsService) {}

  @Get()
  findAll() { return this.service.findAll(); }

  @Get(':id')
  findById(@Param('id') id: string) { return this.service.findById(id); }

  @Post()
  @UseGuards(PermissionsGuard) @RequirePermissions('departments.manage')
  create(@Body() body: { name: string; slug: string; description?: string; color?: string; icon?: string }) {
    return this.service.create(body);
  }

  @Put(':id')
  @UseGuards(PermissionsGuard) @RequirePermissions('departments.manage')
  update(@Param('id') id: string, @Body() body: any) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard) @RequirePermissions('departments.manage')
  delete(@Param('id') id: string) { return this.service.delete(id); }
}
