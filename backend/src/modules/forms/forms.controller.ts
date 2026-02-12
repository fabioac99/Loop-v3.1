import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FormsService } from './forms.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Forms')
@ApiBearerAuth()
@Controller('forms')
@UseGuards(JwtAuthGuard)
export class FormsController {
  constructor(private service: FormsService) {}

  @Get('categories')
  getCategories(@Query('departmentId') departmentId?: string) {
    return this.service.getCategories(departmentId);
  }

  @Post('categories')
  @UseGuards(RolesGuard)
  @Roles('GLOBAL_ADMIN')
  createCategory(@Body() body: any) { return this.service.createCategory(body); }

  @Put('categories/:id')
  @UseGuards(RolesGuard)
  @Roles('GLOBAL_ADMIN')
  updateCategory(@Param('id') id: string, @Body() body: any) { return this.service.updateCategory(id, body); }

  @Delete('categories/:id')
  @UseGuards(RolesGuard)
  @Roles('GLOBAL_ADMIN')
  deleteCategory(@Param('id') id: string) { return this.service.deleteCategory(id); }

  @Get('categories/:categoryId/subtypes')
  getSubtypes(@Param('categoryId') categoryId: string) { return this.service.getSubtypes(categoryId); }

  @Get('subtypes/:id')
  getSubtype(@Param('id') id: string) { return this.service.getSubtype(id); }

  @Post('subtypes')
  @UseGuards(RolesGuard)
  @Roles('GLOBAL_ADMIN')
  createSubtype(@Body() body: any) { return this.service.createSubtype(body); }

  @Put('subtypes/:id')
  @UseGuards(RolesGuard)
  @Roles('GLOBAL_ADMIN')
  updateSubtype(@Param('id') id: string, @Body() body: any) { return this.service.updateSubtype(id, body); }

  @Delete('subtypes/:id')
  @UseGuards(RolesGuard)
  @Roles('GLOBAL_ADMIN')
  deleteSubtype(@Param('id') id: string) { return this.service.deleteSubtype(id); }

  @Get('schemas')
  getSchemas() { return this.service.getSchemas(); }

  @Get('schemas/:id')
  getSchema(@Param('id') id: string) { return this.service.getSchema(id); }

  @Post('schemas')
  @UseGuards(RolesGuard)
  @Roles('GLOBAL_ADMIN')
  createSchema(@Body() body: any) { return this.service.createSchema(body); }

  @Put('schemas/:id')
  @UseGuards(RolesGuard)
  @Roles('GLOBAL_ADMIN')
  updateSchema(@Param('id') id: string, @Body() body: any) { return this.service.updateSchema(id, body); }

  @Get('hierarchy/:departmentId')
  getHierarchy(@Param('departmentId') departmentId: string) { return this.service.getHierarchy(departmentId); }
}
