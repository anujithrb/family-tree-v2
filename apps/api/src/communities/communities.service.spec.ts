import { Test, TestingModule } from '@nestjs/testing';
import { CommunitiesService } from './communities.service';
import { PrismaService } from '@family-tree/database';
import { BadRequestException } from '@nestjs/common';

describe('CommunitiesService', () => {
  let service: CommunitiesService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn((fn) => fn(prisma)),
      community: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
      person: { create: jest.fn(), count: jest.fn().mockResolvedValue(0) },
      treeNode: { create: jest.fn() },
      couple: { create: jest.fn() },
      coupleChild: { create: jest.fn() },
      communityAdmin: { create: jest.fn() },
      user: { findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunitiesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CommunitiesService>(CommunitiesService);
  });

  describe('createCommunity', () => {
    it('rejects when no isSelf node is provided by community admin', async () => {
      const dto = {
        name: 'Test Family',
        nodes: [
          { tempId: 't1', name: 'Parent A' },
          { tempId: 't2', name: 'Parent B' },
        ],
        couples: [{ spouse1: 't1', spouse2: 't2' }],
        children: [],
      };

      await expect(
        service.createCommunity(dto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when couples reference unknown tempIds', async () => {
      const dto = {
        name: 'Test Family',
        nodes: [
          { tempId: 't1', name: 'Me', isSelf: true },
          { tempId: 't2', name: 'Spouse' },
        ],
        couples: [{ spouse1: 't1', spouse2: 't999' }],
        children: [],
      };

      await expect(
        service.createCommunity(dto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates community with all entities in a transaction', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        person: { id: 'person-self' },
      });
      prisma.community.create.mockResolvedValue({ id: 'comm-1' });
      prisma.person.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: `person-${data.profileId}`, ...data }),
      );
      prisma.treeNode.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: `node-${data.personId}`, ...data }),
      );
      prisma.couple.create.mockResolvedValue({ id: 'couple-1' });
      prisma.coupleChild.create.mockResolvedValue({});
      prisma.communityAdmin.create.mockResolvedValue({});

      const dto = {
        name: 'Test Family',
        nodes: [
          { tempId: 't1', name: 'Me', gender: 'M', birthYear: 1990, isSelf: true },
          { tempId: 't2', name: 'Spouse', gender: 'F' },
        ],
        couples: [{ spouse1: 't1', spouse2: 't2' }],
        children: [],
      };

      const result = await service.createCommunity(dto, 'user-1');

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.community.create).toHaveBeenCalled();
      expect(prisma.communityAdmin.create).toHaveBeenCalled();
    });
  });

  describe('listCommunities', () => {
    it('returns communities the user belongs to', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        person: {
          treeNodes: [
            { community: { id: 'comm-1', name: 'Family A', createdAt: new Date() } },
          ],
        },
      });

      const result = await service.listCommunities('user-1');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Family A');
    });
  });
});
