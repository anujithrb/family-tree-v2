import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { InviteDto } from './dto/invite.dto';
import { RefreshDto } from './dto/refresh.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('invite')
  @ApiOperation({
    summary: 'Send magic link invite',
    description:
      'Creates a user (if new) and generates a magic link token. In dev mode, the token is returned directly in the response.',
  })
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
  @ApiOperation({
    summary: 'Verify magic link and get JWT tokens',
    description:
      'Validates the magic link token and returns an access token (JWT) and refresh token. Use the access token as a Bearer token for authenticated requests.',
  })
  @ApiParam({ name: 'token', description: 'The magic link token from the invite response' })
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
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Exchange a valid refresh token for a new access token.',
  })
  async refresh(@Body() dto: RefreshDto) {
    const result = await this.authService.refreshAccessToken(dto.refreshToken);
    return { accessToken: result.accessToken };
  }
}
