import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { EntitiesService } from './entities.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Entities')
@ApiBearerAuth('access-token')
@Controller('entities')
@UseGuards(JwtAuthGuard)
export class EntitiesController {
  constructor(private service: EntitiesService) {}

  // ---- CLIENTS ----
  @Get('clients')
  getClients(@Query('search') search?: string, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.service.getClients({ search, page, limit });
  }

  @Get('clients/all')
  getAllClients() {
    return this.service.getAllClients();
  }

  @Get('clients/:id')
  getClient(@Param('id') id: string) {
    return this.service.getClient(id);
  }

  @Post('clients')
  @UseGuards(RolesGuard)
  @Roles('GLOBAL_ADMIN')
  createClient(@Body() body: any) {
    return this.service.createClient(body);
  }

  @Put('clients/:id')
  @UseGuards(RolesGuard)
  @Roles('GLOBAL_ADMIN')
  updateClient(@Param('id') id: string, @Body() body: any) {
    return this.service.updateClient(id, body);
  }

  @Delete('clients/:id')
  @UseGuards(RolesGuard)
  @Roles('GLOBAL_ADMIN')
  deleteClient(@Param('id') id: string) {
    return this.service.deleteClient(id);
  }

  // ---- SUPPLIERS ----
  @Get('suppliers')
  getSuppliers(@Query('search') search?: string, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.service.getSuppliers({ search, page, limit });
  }

  @Get('suppliers/all')
  getAllSuppliers() {
    return this.service.getAllSuppliers();
  }

  @Get('suppliers/:id')
  getSupplier(@Param('id') id: string) {
    return this.service.getSupplier(id);
  }

  @Post('suppliers')
  @UseGuards(RolesGuard)
  @Roles('GLOBAL_ADMIN')
  createSupplier(@Body() body: any) {
    return this.service.createSupplier(body);
  }

  @Put('suppliers/:id')
  @UseGuards(RolesGuard)
  @Roles('GLOBAL_ADMIN')
  updateSupplier(@Param('id') id: string, @Body() body: any) {
    return this.service.updateSupplier(id, body);
  }

  @Delete('suppliers/:id')
  @UseGuards(RolesGuard)
  @Roles('GLOBAL_ADMIN')
  deleteSupplier(@Param('id') id: string) {
    return this.service.deleteSupplier(id);
  }
}
