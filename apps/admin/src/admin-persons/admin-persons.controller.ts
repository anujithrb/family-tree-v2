import { Controller, Get, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from '../admin-auth/guards/admin-auth.guard';
import { AdminPersonsService } from './admin-persons.service';
import { UpdatePersonDto } from './dto/update-person.dto';

@Controller('persons')
@UseGuards(AdminAuthGuard)
export class AdminPersonsController {
  constructor(private readonly adminPersonsService: AdminPersonsService) {}

  @Get()
  list(@Query() filters: { name?: string; page?: number }) {
    return this.adminPersonsService.list(filters);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.adminPersonsService.getById(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePersonDto) {
    return this.adminPersonsService.update(id, dto);
  }
}
