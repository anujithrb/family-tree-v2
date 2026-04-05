import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@family-tree/database';
import * as bcryptjs from 'bcryptjs';
import { authenticator } from 'otplib';
import { randomBytes } from 'crypto';

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string, otpCode?: string) {
    const admin = await this.prisma.adminUser.findUnique({ where: { email } });
    if (!admin) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcryptjs.compare(password, admin.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (admin.otpEnabled && !otpCode) {
      return { requiresOtp: true };
    }

    if (admin.otpEnabled && otpCode) {
      const otpValid = authenticator.verify({ token: otpCode, secret: admin.otpSecret! });
      if (!otpValid) {
        throw new UnauthorizedException('Invalid OTP code');
      }
    }

    const refreshToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000); // 180 days

    const session = await this.prisma.adminSession.create({
      data: {
        adminUserId: admin.id,
        refreshToken,
        expiresAt,
      },
    });

    const accessToken = await this.jwt.signAsync({ sub: admin.id, email: admin.email });

    return { accessToken, refreshToken: session.refreshToken };
  }

  async refresh(refreshToken: string) {
    const session = await this.prisma.adminSession.findUnique({
      where: { refreshToken },
      include: { adminUser: true },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired');
    }

    const accessToken = await this.jwt.signAsync({
      sub: session.adminUser.id,
      email: session.adminUser.email,
    });

    return { accessToken };
  }

  async createAdminUser(email: string, name: string, password: string) {
    const existing = await this.prisma.adminUser.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcryptjs.hash(password, 12);

    return this.prisma.adminUser.create({
      data: { email, name, passwordHash },
    });
  }

  async updateProfile(adminUserId: string, dto: { name?: string; email?: string }) {
    return this.prisma.adminUser.update({
      where: { id: adminUserId },
      data: dto,
      select: { id: true, email: true, name: true, otpEnabled: true },
    });
  }

  async setup2FA(adminUserId: string) {
    const admin = await this.prisma.adminUser.findUnique({ where: { id: adminUserId } });
    if (!admin) {
      throw new BadRequestException('Admin not found');
    }
    if (admin.otpEnabled) {
      throw new BadRequestException('2FA is already enabled');
    }

    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(admin.email, 'FamilyTree Admin', secret);

    return { secret, otpauthUrl };
  }

  async verify2FA(adminUserId: string, otpCode: string, secret: string) {
    const isValid = authenticator.verify({ token: otpCode, secret });
    if (!isValid) {
      throw new BadRequestException('Invalid OTP code');
    }

    return this.prisma.adminUser.update({
      where: { id: adminUserId },
      data: { otpSecret: secret, otpEnabled: true },
    });
  }

  async disable2FA(adminUserId: string) {
    const admin = await this.prisma.adminUser.findUnique({ where: { id: adminUserId } });
    if (!admin) {
      throw new BadRequestException('Admin not found');
    }
    if (!admin.otpEnabled) {
      throw new BadRequestException('2FA is not enabled');
    }

    return this.prisma.adminUser.update({
      where: { id: adminUserId },
      data: { otpSecret: null, otpEnabled: false },
    });
  }
}
