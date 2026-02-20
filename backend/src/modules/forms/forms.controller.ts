import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FormsService } from './forms.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../auth/guards/permissions.guard';

@ApiTags('Forms')
@ApiBearerAuth('access-token')
@Controller('forms')
@UseGuards(JwtAuthGuard)
export class FormsController {
  constructor(private service: FormsService) {}

  @Get('categories')
  getCategories(@Query('departmentId') departmentId?: string) {
    return this.service.getCategories(departmentId);
  }

  @Post('categories')
  @UseGuards(PermissionsGuard) @RequirePermissions('forms.manage')
  createCategory(@Body() body: any) { return this.service.createCategory(body); }

  @Put('categories/:id')
  @UseGuards(PermissionsGuard) @RequirePermissions('forms.manage')
  updateCategory(@Param('id') id: string, @Body() body: any) { return this.service.updateCategory(id, body); }

  @Delete('categories/:id')
  @UseGuards(PermissionsGuard) @RequirePermissions('forms.manage')
  deleteCategory(@Param('id') id: string) { return this.service.deleteCategory(id); }

  @Get('categories/:categoryId/subtypes')
  getSubtypes(@Param('categoryId') categoryId: string) { return this.service.getSubtypes(categoryId); }

  @Get('subtypes/:id')
  getSubtype(@Param('id') id: string) { return this.service.getSubtype(id); }

  @Post('subtypes')
  @UseGuards(PermissionsGuard) @RequirePermissions('forms.manage')
  createSubtype(@Body() body: any) { return this.service.createSubtype(body); }

  @Put('subtypes/:id')
  @UseGuards(PermissionsGuard) @RequirePermissions('forms.manage')
  updateSubtype(@Param('id') id: string, @Body() body: any) { return this.service.updateSubtype(id, body); }

  @Delete('subtypes/:id')
  @UseGuards(PermissionsGuard) @RequirePermissions('forms.manage')
  deleteSubtype(@Param('id') id: string) { return this.service.deleteSubtype(id); }

  @Get('schemas')
  getSchemas() { return this.service.getSchemas(); }

  @Get('schemas/:id')
  getSchema(@Param('id') id: string) { return this.service.getSchema(id); }

  @Post('schemas')
  @UseGuards(PermissionsGuard) @RequirePermissions('forms.manage')
  createSchema(@Body() body: any) { return this.service.createSchema(body); }

  @Put('schemas/:id')
  @UseGuards(PermissionsGuard) @RequirePermissions('forms.manage')
  updateSchema(@Param('id') id: string, @Body() body: any) { return this.service.updateSchema(id, body); }

  @Get('hierarchy/:departmentId')
  getHierarchy(@Param('departmentId') departmentId: string) { return this.service.getHierarchy(departmentId); }
}
