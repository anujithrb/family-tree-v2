import { Controller, Post, Get, Put, Delete, Body, UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { CurrentAdmin } from './decorators/current-admin.decorator';
import { AdminAuthService } from './admin-auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { UpdateAdminProfileDto } from './dto/update-admin-profile.dto';
import { Verify2FADto } from './dto/verify-2fa.dto';

@Controller('auth')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.adminAuthService.login(dto.email, dto.password, dto.otpCode);
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshDto) {
    return this.adminAuthService.refresh(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(AdminAuthGuard)
  async getProfile(@CurrentAdmin() admin: any) {
    return { id: admin.id, email: admin.email };
  }

  @Put('me')
  @UseGuards(AdminAuthGuard)
  async updateProfile(@CurrentAdmin() admin: any, @Body() dto: UpdateAdminProfileDto) {
    return this.adminAuthService.updateProfile(admin.id, dto);
  }

  @Post('2fa/setup')
  @UseGuards(AdminAuthGuard)
  async setup2FA(@CurrentAdmin() admin: any) {
    return this.adminAuthService.setup2FA(admin.id);
  }

  @Post('2fa/verify')
  @UseGuards(AdminAuthGuard)
  async verify2FA(@CurrentAdmin() admin: any, @Body() dto: Verify2FADto) {
    return this.adminAuthService.verify2FA(admin.id, dto.otpCode, dto.secret);
  }

  @Delete('2fa')
  @UseGuards(AdminAuthGuard)
  async disable2FA(@CurrentAdmin() admin: any) {
    return this.adminAuthService.disable2FA(admin.id);
  }
}
