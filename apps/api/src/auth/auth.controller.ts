import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Headers,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { InviteDto } from './dto/invite.dto';
import { RefreshDto } from './dto/refresh.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('invite')
  async invite(@Body() dto: InviteDto) {
    const result = await this.authService.sendInvite(dto.email, dto.displayName);
    // In production, don't return the token — it's sent via email.
    // For the prototype, return it for easy testing.
    return {
      message: 'Invite sent. Check server logs for the magic link.',
      magicLinkToken: result.magicLinkToken,
      userId: result.userId,
    };
  }

  @Public()
  @Get('verify/:token')
  async verify(
    @Param('token') token: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    const result = await this.authService.verifyMagicLink(token, userAgent);
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  }

  @Public()
  @Post('refresh')
  async refresh(@Body() dto: RefreshDto) {
    const result = await this.authService.refreshAccessToken(dto.refreshToken);
    return { accessToken: result.accessToken };
  }
}
