import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthGuard } from '../admin-auth/guards/admin-auth.guard';
import { CurrentAdmin } from '../admin-auth/decorators/current-admin.decorator';
import { AdminLinksService } from './admin-links.service';
import { CreateLinkDto } from './dto/create-link.dto';
import { OverrideStatusDto } from './dto/override-status.dto';

@Controller('links')
@UseGuards(AdminAuthGuard)
export class AdminLinksController {
  constructor(private readonly adminLinksService: AdminLinksService) {}

  @Get()
  list(@Query() filters: { status?: string; page?: number }) {
    return this.adminLinksService.list(filters);
  }

  @Post()
  createApproved(@Body() dto: CreateLinkDto, @CurrentAdmin() admin: any) {
    return this.adminLinksService.createApproved(dto.treeNodeAId, dto.treeNodeBId, admin.id);
  }

  @Put(':id')
  overrideStatus(
    @Param('id') id: string,
    @Body() dto: OverrideStatusDto,
    @CurrentAdmin() admin: any,
  ) {
    return this.adminLinksService.overrideStatus(id, dto.status, admin.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.adminLinksService.remove(id);
  }
}
