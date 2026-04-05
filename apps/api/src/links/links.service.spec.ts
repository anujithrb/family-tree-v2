import { Test } from '@nestjs/testing';
import { LinksService } from './links.service';
import { PrismaService } from '@family-tree/database';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

describe('LinksService', () => {
  let service: LinksService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      treeNode: { findUnique: jest.fn() },
      crossCommunityLink: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      crossCommunityLinkAction: { create: jest.fn() },
      communityAdmin: { findMany: jest.fn() },
      $transaction: jest.fn((fn: any) => fn(prisma)),
    };

    const module = await Test.createTestingModule({
      providers: [
        LinksService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(LinksService);
  });

  describe('requestLink', () => {
    const dto = { treeNodeAId: 'nodeA', treeNodeBId: 'nodeB' };
    const actorId = 'user1';

    it('creates a pending link and logs the request action', async () => {
      prisma.treeNode.findUnique
        .mockResolvedValueOnce({
          id: 'nodeA',
          communityId: 'comm1',
          person: { id: 'p1', userId: null, user: null },
          community: { id: 'comm1', name: 'Community 1' },
        })
        .mockResolvedValueOnce({
          id: 'nodeB',
          communityId: 'comm2',
          person: { id: 'p2', userId: null, user: null },
          community: { id: 'comm2', name: 'Community 2' },
        });

      prisma.communityAdmin.findMany.mockResolvedValue([
        { communityId: 'comm1', userId: actorId },
      ]);

      prisma.crossCommunityLink.findFirst.mockResolvedValue(null);

      const createdLink = {
        id: 'link1',
        treeNodeAId: 'nodeA',
        treeNodeBId: 'nodeB',
        status: 'pending',
        createdAt: new Date(),
      };
      prisma.crossCommunityLink.create.mockResolvedValue(createdLink);
      prisma.crossCommunityLinkAction.create.mockResolvedValue({});

      const result = await service.requestLink(dto, actorId);

      expect(prisma.crossCommunityLink.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          treeNodeAId: 'nodeA',
          treeNodeBId: 'nodeB',
          status: 'pending',
        }),
      });
      expect(prisma.crossCommunityLinkAction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          linkId: 'link1',
          action: 'requested',
          actorType: 'user',
          actorId,
        }),
      });
      expect(result.status).toBe('pending');
    });

    it('rejects if both TreeNodes are in the same community', async () => {
      prisma.treeNode.findUnique
        .mockResolvedValueOnce({
          id: 'nodeA',
          communityId: 'comm1',
          person: { id: 'p1', userId: null, user: null },
          community: { id: 'comm1', name: 'Community 1' },
        })
        .mockResolvedValueOnce({
          id: 'nodeB',
          communityId: 'comm1',
          person: { id: 'p2', userId: null, user: null },
          community: { id: 'comm1', name: 'Community 1' },
        });

      prisma.communityAdmin.findMany.mockResolvedValue([
        { communityId: 'comm1', userId: actorId },
      ]);

      await expect(service.requestLink(dto, actorId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects if either TreeNode Person has a User (registered)', async () => {
      prisma.treeNode.findUnique
        .mockResolvedValueOnce({
          id: 'nodeA',
          communityId: 'comm1',
          person: { id: 'p1', userId: 'u1', user: { id: 'u1' } },
          community: { id: 'comm1', name: 'Community 1' },
        })
        .mockResolvedValueOnce({
          id: 'nodeB',
          communityId: 'comm2',
          person: { id: 'p2', userId: null, user: null },
          community: { id: 'comm2', name: 'Community 2' },
        });

      prisma.communityAdmin.findMany.mockResolvedValue([
        { communityId: 'comm1', userId: actorId },
      ]);

      await expect(service.requestLink(dto, actorId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects if a link already exists between these nodes', async () => {
      prisma.treeNode.findUnique
        .mockResolvedValueOnce({
          id: 'nodeA',
          communityId: 'comm1',
          person: { id: 'p1', userId: null, user: null },
          community: { id: 'comm1', name: 'Community 1' },
        })
        .mockResolvedValueOnce({
          id: 'nodeB',
          communityId: 'comm2',
          person: { id: 'p2', userId: null, user: null },
          community: { id: 'comm2', name: 'Community 2' },
        });

      prisma.communityAdmin.findMany.mockResolvedValue([
        { communityId: 'comm1', userId: actorId },
      ]);

      prisma.crossCommunityLink.findFirst.mockResolvedValue({
        id: 'existing-link',
      });

      await expect(service.requestLink(dto, actorId)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('approveLink', () => {
    const actorId = 'user2';

    it('approves a pending link and logs the action', async () => {
      const link = {
        id: 'link1',
        status: 'pending',
        treeNodeAId: 'nodeA',
        treeNodeBId: 'nodeB',
        treeNodeB: { communityId: 'comm2' },
      };
      prisma.crossCommunityLink.findUnique.mockResolvedValue(link);
      prisma.communityAdmin.findMany.mockResolvedValue([
        { communityId: 'comm2', userId: actorId },
      ]);
      prisma.crossCommunityLink.update.mockResolvedValue({
        ...link,
        status: 'approved',
      });
      prisma.crossCommunityLinkAction.create.mockResolvedValue({});

      const result = await service.approveLink('link1', actorId);

      expect(prisma.crossCommunityLink.update).toHaveBeenCalledWith({
        where: { id: 'link1' },
        data: { status: 'approved' },
      });
      expect(prisma.crossCommunityLinkAction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          linkId: 'link1',
          action: 'approved',
          actorType: 'user',
          actorId,
        }),
      });
      expect(result.status).toBe('approved');
    });

    it('rejects if link is not pending', async () => {
      prisma.crossCommunityLink.findUnique.mockResolvedValue({
        id: 'link1',
        status: 'approved',
        treeNodeB: { communityId: 'comm2' },
      });
      prisma.communityAdmin.findMany.mockResolvedValue([
        { communityId: 'comm2', userId: actorId },
      ]);

      await expect(service.approveLink('link1', actorId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('validates requesting user is admin of the OTHER community', async () => {
      prisma.crossCommunityLink.findUnique.mockResolvedValue({
        id: 'link1',
        status: 'pending',
        treeNodeB: { communityId: 'comm2' },
      });
      // Actor is NOT admin of comm2
      prisma.communityAdmin.findMany.mockResolvedValue([
        { communityId: 'comm1', userId: actorId },
      ]);

      await expect(service.approveLink('link1', actorId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('rejectLink', () => {
    it('rejects a pending link and logs the action', async () => {
      const actorId = 'user2';
      const link = {
        id: 'link1',
        status: 'pending',
        treeNodeB: { communityId: 'comm2' },
      };
      prisma.crossCommunityLink.findUnique.mockResolvedValue(link);
      prisma.communityAdmin.findMany.mockResolvedValue([
        { communityId: 'comm2', userId: actorId },
      ]);
      prisma.crossCommunityLink.update.mockResolvedValue({
        ...link,
        status: 'rejected',
      });
      prisma.crossCommunityLinkAction.create.mockResolvedValue({});

      const result = await service.rejectLink('link1', actorId);

      expect(prisma.crossCommunityLink.update).toHaveBeenCalledWith({
        where: { id: 'link1' },
        data: { status: 'rejected' },
      });
      expect(result.status).toBe('rejected');
    });
  });

  describe('getPendingLinks', () => {
    it('returns pending links for communities the user administers', async () => {
      const userId = 'user1';
      prisma.communityAdmin.findMany.mockResolvedValue([
        { communityId: 'comm1', userId },
      ]);

      const pendingLinks = [
        {
          id: 'link1',
          status: 'pending',
          treeNodeAId: 'nodeA',
          treeNodeBId: 'nodeB',
          treeNodeA: {
            id: 'nodeA',
            person: { name: 'PersonA' },
            community: { name: 'Community A' },
          },
          treeNodeB: {
            id: 'nodeB',
            person: { name: 'PersonB' },
            community: { name: 'Community B' },
          },
          actions: [],
          createdAt: new Date(),
        },
      ];
      prisma.crossCommunityLink.findMany.mockResolvedValue(pendingLinks);

      const result = await service.getPendingLinks(userId);

      expect(prisma.crossCommunityLink.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: 'pending',
            treeNodeB: { communityId: { in: ['comm1'] } },
          },
        }),
      );
      expect(result).toHaveLength(1);
    });
  });
});
