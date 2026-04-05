import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthGuard } from '../admin-auth/guards/admin-auth.guard';
import { AdminManagementService } from './admin-management.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';

@Controller('admins')
@UseGuards(AdminAuthGuard)
export class AdminManagementController {
  constructor(private readonly adminManagementService: AdminManagementService) {}

  @Get()
  list() {
    return this.adminManagementService.list();
  }

  @Post()
  create(@Body() dto: CreateAdminDto) {
    return this.adminManagementService.create(dto.email, dto.name, dto.password);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAdminDto) {
    return this.adminManagementService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.adminManagementService.remove(id);
  }
}
