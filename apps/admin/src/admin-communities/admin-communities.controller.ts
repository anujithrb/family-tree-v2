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
import { AdminCommunitiesService } from './admin-communities.service';
import { CreateCommunityDto } from './dto/create-community.dto';
import { UpdateCommunityDto } from './dto/update-community.dto';
import { AssignAdminsDto } from './dto/assign-admins.dto';

@Controller('communities')
@UseGuards(AdminAuthGuard)
export class AdminCommunitiesController {
  constructor(private readonly adminCommunitiesService: AdminCommunitiesService) {}

  @Get()
  list() {
    return this.adminCommunitiesService.list();
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.adminCommunitiesService.getById(id);
  }

  @Post()
  create(@Body() dto: CreateCommunityDto) {
    return this.adminCommunitiesService.create(dto.name);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCommunityDto) {
    return this.adminCommunitiesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.adminCommunitiesService.remove(id);
  }

  @Put(':id/admins')
  assignAdmins(@Param('id') id: string, @Body() dto: AssignAdminsDto) {
    return this.adminCommunitiesService.assignAdmins(id, dto.admins);
  }
}
