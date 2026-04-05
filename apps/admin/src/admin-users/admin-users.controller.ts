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
import { AdminUsersService } from './admin-users.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(AdminAuthGuard)
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  list(@Query() filters: { status?: string; name?: string; email?: string; page?: number }) {
    return this.adminUsersService.list(filters);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.adminUsersService.getById(id);
  }

  @Post('invite')
  invite(@Body() dto: InviteUserDto) {
    return this.adminUsersService.invite(dto.email, dto.displayName);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.adminUsersService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.adminUsersService.remove(id);
  }
}
