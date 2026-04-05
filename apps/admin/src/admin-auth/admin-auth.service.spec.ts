import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service';
import { PrismaService } from '@family-tree/database';

describe('AdminAuthService', () => {
  let service: AdminAuthService;
  let prisma: any;
  let jwtService: any;

  beforeEach(async () => {
    prisma = {
      adminUser: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      adminSession: {
        create: jest.fn(),
        findUnique: jest.fn(),
        deleteMany: jest.fn(),
      },
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('mock-access-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AdminAuthService>(AdminAuthService);
  });

  describe('login', () => {
    it('returns tokens when email and password are valid (no 2FA)', async () => {
      const bcryptjs = require('bcryptjs');
      const hash = await bcryptjs.hash('password123', 10);
      prisma.adminUser.findUnique.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@test.com',
        name: 'Admin',
        passwordHash: hash,
        otpEnabled: false,
        otpSecret: null,
      });
      prisma.adminSession.create.mockResolvedValue({ refreshToken: 'refresh-123' });

      const result = await service.login('admin@test.com', 'password123');

      expect(result).toHaveProperty('accessToken', 'mock-access-token');
      expect(result).toHaveProperty('refreshToken', 'refresh-123');
    });

    it('returns requiresOtp flag when 2FA is enabled and no OTP provided', async () => {
      const bcryptjs = require('bcryptjs');
      const hash = await bcryptjs.hash('password123', 10);
      prisma.adminUser.findUnique.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@test.com',
        name: 'Admin',
        passwordHash: hash,
        otpEnabled: true,
        otpSecret: 'JBSWY3DPEHPK3PXP',
      });

      const result = await service.login('admin@test.com', 'password123');

      expect(result).toHaveProperty('requiresOtp', true);
    });

    it('returns tokens when email, password, and valid OTP provided', async () => {
      const bcryptjs = require('bcryptjs');
      const { authenticator } = require('otplib');
      const hash = await bcryptjs.hash('password123', 10);
      const secret = authenticator.generateSecret();
      const otpCode = authenticator.generate(secret);

      prisma.adminUser.findUnique.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@test.com',
        name: 'Admin',
        passwordHash: hash,
        otpEnabled: true,
        otpSecret: secret,
      });
      prisma.adminSession.create.mockResolvedValue({ refreshToken: 'refresh-123' });

      const result = await service.login('admin@test.com', 'password123', otpCode);

      expect(result).toHaveProperty('accessToken', 'mock-access-token');
      expect(result).toHaveProperty('refreshToken', 'refresh-123');
    });

    it('rejects invalid password', async () => {
      const bcryptjs = require('bcryptjs');
      const hash = await bcryptjs.hash('correctpassword', 10);
      prisma.adminUser.findUnique.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@test.com',
        passwordHash: hash,
        otpEnabled: false,
      });

      await expect(service.login('admin@test.com', 'wrongpassword')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects invalid OTP code', async () => {
      const bcryptjs = require('bcryptjs');
      const { authenticator } = require('otplib');
      const hash = await bcryptjs.hash('password123', 10);
      const secret = authenticator.generateSecret();

      prisma.adminUser.findUnique.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@test.com',
        passwordHash: hash,
        otpEnabled: true,
        otpSecret: secret,
      });

      await expect(service.login('admin@test.com', 'password123', '000000')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects non-existent email', async () => {
      prisma.adminUser.findUnique.mockResolvedValue(null);

      await expect(service.login('nobody@test.com', 'password123')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refresh', () => {
    it('returns new access token for valid refresh token', async () => {
      prisma.adminSession.findUnique.mockResolvedValue({
        id: 's-1',
        adminUser: { id: 'admin-1', email: 'admin@test.com' },
        expiresAt: new Date(Date.now() + 86400000),
      });

      const result = await service.refresh('valid-refresh-token');

      expect(result).toHaveProperty('accessToken', 'mock-access-token');
    });

    it('rejects expired refresh token', async () => {
      prisma.adminSession.findUnique.mockResolvedValue({
        id: 's-1',
        adminUser: { id: 'admin-1', email: 'admin@test.com' },
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.refresh('expired-token')).rejects.toThrow(UnauthorizedException);
    });

    it('rejects invalid refresh token', async () => {
      prisma.adminSession.findUnique.mockResolvedValue(null);

      await expect(service.refresh('invalid-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('createAdminUser', () => {
    it('hashes password and creates AdminUser', async () => {
      prisma.adminUser.findUnique.mockResolvedValue(null);
      prisma.adminUser.create.mockResolvedValue({
        id: 'admin-1',
        email: 'new@test.com',
        name: 'New Admin',
      });

      const result = await service.createAdminUser('new@test.com', 'New Admin', 'password123');

      expect(prisma.adminUser.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'new@test.com',
            name: 'New Admin',
          }),
        }),
      );
      // password should be hashed, not plain
      const callData = prisma.adminUser.create.mock.calls[0][0].data;
      expect(callData.passwordHash).not.toBe('password123');
      expect(result).toHaveProperty('id', 'admin-1');
    });

    it('rejects duplicate email', async () => {
      prisma.adminUser.findUnique.mockResolvedValue({ id: 'existing', email: 'dup@test.com' });

      await expect(service.createAdminUser('dup@test.com', 'Name', 'pass')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('2FA management', () => {
    describe('setup2FA', () => {
      it('generates OTP secret and returns otpauth URI for QR code', async () => {
        prisma.adminUser.findUnique.mockResolvedValue({
          id: 'admin-1',
          email: 'admin@test.com',
          otpEnabled: false,
        });

        const result = await service.setup2FA('admin-1');

        expect(result).toHaveProperty('secret');
        expect(result).toHaveProperty('otpauthUrl');
        expect(result.otpauthUrl).toContain('otpauth://totp/');
        // Secret NOT saved yet
        expect(prisma.adminUser.update).not.toHaveBeenCalled();
      });

      it('rejects if 2FA already enabled', async () => {
        prisma.adminUser.findUnique.mockResolvedValue({
          id: 'admin-1',
          email: 'admin@test.com',
          otpEnabled: true,
        });

        await expect(service.setup2FA('admin-1')).rejects.toThrow(BadRequestException);
      });
    });

    describe('verify2FA', () => {
      it('verifies OTP code against secret and enables 2FA', async () => {
        const { authenticator } = require('otplib');
        const secret = authenticator.generateSecret();
        const otpCode = authenticator.generate(secret);

        prisma.adminUser.update.mockResolvedValue({ id: 'admin-1', otpEnabled: true });

        await service.verify2FA('admin-1', otpCode, secret);

        expect(prisma.adminUser.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 'admin-1' },
            data: expect.objectContaining({ otpSecret: secret, otpEnabled: true }),
          }),
        );
      });

      it('rejects invalid OTP code during verification', async () => {
        const { authenticator } = require('otplib');
        const secret = authenticator.generateSecret();

        await expect(service.verify2FA('admin-1', '000000', secret)).rejects.toThrow(
          BadRequestException,
        );
      });
    });

    describe('disable2FA', () => {
      it('clears otpSecret and sets otpEnabled to false', async () => {
        prisma.adminUser.findUnique.mockResolvedValue({
          id: 'admin-1',
          otpEnabled: true,
        });
        prisma.adminUser.update.mockResolvedValue({ id: 'admin-1', otpEnabled: false });

        await service.disable2FA('admin-1');

        expect(prisma.adminUser.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 'admin-1' },
            data: { otpSecret: null, otpEnabled: false },
          }),
        );
      });

      it('rejects if 2FA not enabled', async () => {
        prisma.adminUser.findUnique.mockResolvedValue({
          id: 'admin-1',
          otpEnabled: false,
        });

        await expect(service.disable2FA('admin-1')).rejects.toThrow(BadRequestException);
      });
    });
  });
});
