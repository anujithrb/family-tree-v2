import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '@family-tree/database';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;
  let configService: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      magicLink: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      session: {
        create: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('mock-access-token'),
    };
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'MAGIC_LINK_EXPIRY_MINUTES') return '15';
        if (key === 'SESSION_EXPIRY_DAYS') return '180';
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('sendInvite', () => {
    it('creates a new user and magic link for unknown email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'user-1', email: 'test@example.com', displayName: 'test', status: 'invited' });
      prisma.magicLink.create.mockResolvedValue({ id: 'ml-1', token: 'abc123' });

      const result = await service.sendInvite('test@example.com', 'Test User');

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: 'test@example.com', displayName: 'Test User', status: 'invited' }),
        }),
      );
      expect(prisma.magicLink.create).toHaveBeenCalled();
      expect(result).toHaveProperty('magicLinkToken');
    });

    it('creates only a magic link for existing user', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      prisma.magicLink.create.mockResolvedValue({ id: 'ml-1', token: 'abc123' });

      const result = await service.sendInvite('test@example.com', 'Test User');

      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(prisma.magicLink.create).toHaveBeenCalled();
      expect(result).toHaveProperty('magicLinkToken');
    });
  });

  describe('verifyMagicLink', () => {
    it('throws UnauthorizedException for invalid token', async () => {
      prisma.magicLink.findUnique.mockResolvedValue(null);
      await expect(service.verifyMagicLink('bad-token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for expired token', async () => {
      prisma.magicLink.findUnique.mockResolvedValue({
        id: 'ml-1',
        token: 'expired',
        expiresAt: new Date(Date.now() - 1000),
        usedAt: null,
        user: { id: 'user-1', email: 'test@example.com' },
      });
      await expect(service.verifyMagicLink('expired')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for already-used token', async () => {
      prisma.magicLink.findUnique.mockResolvedValue({
        id: 'ml-1',
        token: 'used',
        expiresAt: new Date(Date.now() + 60000),
        usedAt: new Date(),
        user: { id: 'user-1', email: 'test@example.com' },
      });
      await expect(service.verifyMagicLink('used')).rejects.toThrow(UnauthorizedException);
    });

    it('returns tokens for valid magic link', async () => {
      prisma.magicLink.findUnique.mockResolvedValue({
        id: 'ml-1',
        token: 'valid',
        expiresAt: new Date(Date.now() + 60000),
        usedAt: null,
        userId: 'user-1',
        user: { id: 'user-1', email: 'test@example.com', status: 'invited' },
      });
      prisma.magicLink.update.mockResolvedValue({});
      prisma.user.update.mockResolvedValue({});
      prisma.session.create.mockResolvedValue({ refreshToken: 'refresh-123' });

      const result = await service.verifyMagicLink('valid');

      expect(result).toHaveProperty('accessToken', 'mock-access-token');
      expect(result).toHaveProperty('refreshToken', 'refresh-123');
      expect(prisma.magicLink.update).toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: { status: 'active' },
        }),
      );
    });
  });

  describe('refreshAccessToken', () => {
    it('throws UnauthorizedException for invalid refresh token', async () => {
      prisma.session.findUnique.mockResolvedValue(null);
      await expect(service.refreshAccessToken('bad-token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for expired session', async () => {
      prisma.session.findUnique.mockResolvedValue({
        id: 's-1',
        expiresAt: new Date(Date.now() - 1000),
        user: { id: 'user-1', email: 'test@example.com' },
      });
      prisma.session.delete.mockResolvedValue({});
      await expect(service.refreshAccessToken('expired-refresh')).rejects.toThrow(UnauthorizedException);
    });

    it('returns new access token for valid refresh token', async () => {
      prisma.session.findUnique.mockResolvedValue({
        id: 's-1',
        expiresAt: new Date(Date.now() + 86400000),
        user: { id: 'user-1', email: 'test@example.com' },
      });

      const result = await service.refreshAccessToken('valid-refresh');

      expect(result).toHaveProperty('accessToken', 'mock-access-token');
    });
  });
});
