import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@family-tree/database';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async sendInvite(
    email: string,
    displayName: string,
  ): Promise<{ magicLinkToken: string; userId: string }> {
    let user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await this.prisma.user.create({
        data: { email, displayName, status: 'invited' },
      });
    }

    const token = randomBytes(32).toString('hex');
    const expiryMinutes = parseInt(
      this.configService.get<string>('MAGIC_LINK_EXPIRY_MINUTES') || '15',
      10,
    );
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    await this.prisma.magicLink.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    // In production, send email with link. For prototype, log it.
    console.log(`[MAGIC LINK] ${email}: /api/auth/verify/${token}`);

    return { magicLinkToken: token, userId: user.id };
  }

  async verifyMagicLink(
    token: string,
    deviceInfo?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const magicLink = await this.prisma.magicLink.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!magicLink) {
      throw new UnauthorizedException('Invalid magic link');
    }

    if (magicLink.usedAt) {
      throw new UnauthorizedException('Magic link already used');
    }

    if (magicLink.expiresAt < new Date()) {
      throw new UnauthorizedException('Magic link expired');
    }

    // Mark magic link as used
    await this.prisma.magicLink.update({
      where: { id: magicLink.id },
      data: { usedAt: new Date() },
    });

    // Activate user if invited
    if (magicLink.user.status === 'invited') {
      await this.prisma.user.update({
        where: { id: magicLink.user.id },
        data: { status: 'active' },
      });
    }

    // Create session with refresh token
    const refreshToken = randomBytes(32).toString('hex');
    const sessionExpiryDays = parseInt(
      this.configService.get<string>('SESSION_EXPIRY_DAYS') || '180',
      10,
    );
    const expiresAt = new Date(
      Date.now() + sessionExpiryDays * 24 * 60 * 60 * 1000,
    );

    const session = await this.prisma.session.create({
      data: {
        userId: magicLink.user.id,
        refreshToken,
        deviceInfo: deviceInfo || null,
        expiresAt,
      },
    });

    // Generate access token
    const accessToken = await this.generateAccessToken(
      magicLink.user.id,
      magicLink.user.email,
    );

    return { accessToken, refreshToken: session.refreshToken };
  }

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: string }> {
    const session = await this.prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (session.expiresAt < new Date()) {
      await this.prisma.session.delete({ where: { id: session.id } });
      throw new UnauthorizedException('Session expired');
    }

    const accessToken = await this.generateAccessToken(
      session.user.id,
      session.user.email,
    );

    return { accessToken };
  }

  private async generateAccessToken(
    userId: string,
    email: string,
  ): Promise<string> {
    return this.jwtService.signAsync({ sub: userId, email });
  }
}
