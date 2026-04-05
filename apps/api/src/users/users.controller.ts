import { Controller, Get, Put, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { CurrentUser, RequestUser } from '../auth/user.decorator';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getProfile(@CurrentUser() user: RequestUser) {
    return this.usersService.getProfile(user.id);
  }

  @Put('me')
  async updateProfile(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateProfile(user.id, dto);
  }
}
