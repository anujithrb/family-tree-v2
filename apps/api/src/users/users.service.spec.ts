import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '@family-tree/database';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      person: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('getProfile', () => {
    it('returns user with linked person data', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        displayName: 'Test User',
        profilePhoto: null,
        status: 'active',
        person: {
          id: 'person-1',
          profileId: 'test.user',
          name: 'Test User',
          birthYear: 1990,
          gender: 'M',
          isDeceased: false,
        },
      });

      const result = await service.getProfile('user-1');

      expect(result.email).toBe('test@example.com');
      expect(result.person?.profileId).toBe('test.user');
    });

    it('throws NotFoundException for unknown user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getProfile('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('updates user displayName and profilePhoto', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', person: null });
      prisma.user.update.mockResolvedValue({
        id: 'user-1',
        displayName: 'New Name',
        profilePhoto: '/uploads/photo.jpg',
      });

      const result = await service.updateProfile('user-1', {
        displayName: 'New Name',
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { displayName: 'New Name' },
        include: { person: true },
      });
    });

    it('also updates linked person name when displayName changes', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        person: { id: 'person-1' },
      });
      prisma.user.update.mockResolvedValue({ id: 'user-1', displayName: 'New Name', person: { id: 'person-1', name: 'New Name' } });
      prisma.person.update.mockResolvedValue({});

      await service.updateProfile('user-1', { displayName: 'New Name' });

      expect(prisma.person.update).toHaveBeenCalledWith({
        where: { id: 'person-1' },
        data: { name: 'New Name' },
      });
    });
  });
});
