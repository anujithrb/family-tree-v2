import { Test, TestingModule } from '@nestjs/testing';
import { TreeService } from './tree.service';
import { PrismaService } from '@family-tree/database';

describe('TreeService', () => {
  let service: TreeService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      community: { findUnique: jest.fn() },
      treeNode: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
      couple: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      coupleChild: {
        findMany: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
      },
      person: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
      },
      $transaction: jest.fn((fn: any) => fn(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TreeService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<TreeService>(TreeService);
  });

  describe('getTree', () => {
    it('returns tree with computed bloodline status', async () => {
      prisma.community.findUnique.mockResolvedValue({ id: 'c1', name: 'Family' });

      prisma.treeNode.findMany.mockResolvedValue([
        { id: 'n1', personId: 'p1', person: { id: 'p1', profileId: 'dad', name: 'Dad', gender: 'M', birthYear: 1960, deathYear: null, isDeceased: false, userId: null, user: null } },
        { id: 'n2', personId: 'p2', person: { id: 'p2', profileId: 'mom', name: 'Mom', gender: 'F', birthYear: 1963, deathYear: null, isDeceased: false, userId: null, user: null } },
        { id: 'n3', personId: 'p3', person: { id: 'p3', profileId: 'kid', name: 'Kid', gender: 'M', birthYear: 1990, deathYear: null, isDeceased: false, userId: null, user: null } },
      ]);

      prisma.couple.findMany.mockResolvedValue([
        { id: 'cp1', spouse1Id: 'n1', spouse2Id: 'n2', status: 'married', marriageDate: null, divorceDate: null },
      ]);

      prisma.coupleChild.findMany.mockResolvedValue([
        { coupleId: 'cp1', childId: 'n3', sortOrder: 0 },
      ]);

      const result = await service.getTree('c1');

      expect(result.communityName).toBe('Family');
      expect(result.people).toHaveLength(3);
      expect(result.couples).toHaveLength(1);
      // Root couple: neither has parents -> storage order
      expect(result.couples[0].spouseAId).toBe('n1');
      expect(result.couples[0].spouseBId).toBe('n2');
      expect(result.couples[0].children).toEqual(['n3']);
    });
  });

  describe('addSpouse (cross-community)', () => {
    it('creates TreeNode with existing personId when spouse is registered user', async () => {
      // Existing node that the spouse will be linked to
      prisma.treeNode.findUnique.mockResolvedValue({
        id: 'n1',
        communityId: 'c1',
        spouse1In: null,
        spouse2In: null,
      });

      // The registered user's Person
      prisma.person.findFirst = jest.fn().mockResolvedValue({
        id: 'existing-person',
        userId: 'u1',
        name: 'Existing User',
      });

      // No existing TreeNode in this community
      prisma.treeNode.findFirst = jest.fn().mockResolvedValue(null);

      // Create new TreeNode reusing existing personId
      prisma.treeNode.create = jest.fn().mockResolvedValue({
        id: 'new-node',
        communityId: 'c1',
        personId: 'existing-person',
      });

      prisma.couple.create.mockResolvedValue({
        id: 'cp-new',
        spouse1Id: 'n1',
        spouse2Id: 'new-node',
      });

      const result = await service.addSpouse('c1', 'n1', {
        name: 'Existing User',
        userId: 'u1',
      });

      // Should NOT create a new Person
      expect(prisma.person.create).not.toHaveBeenCalled();
      // Should create TreeNode with existing personId
      expect(prisma.treeNode.create).toHaveBeenCalledWith({
        data: { communityId: 'c1', personId: 'existing-person' },
      });
      expect(result.personId).toBe('existing-person');
    });

    it('does not create CrossCommunityLink for registered users', async () => {
      prisma.treeNode.findUnique.mockResolvedValue({
        id: 'n1',
        communityId: 'c1',
        spouse1In: null,
        spouse2In: null,
      });

      prisma.person.findFirst = jest.fn().mockResolvedValue({
        id: 'existing-person',
        userId: 'u1',
      });
      prisma.treeNode.findFirst = jest.fn().mockResolvedValue(null);
      prisma.treeNode.create = jest.fn().mockResolvedValue({
        id: 'new-node',
        communityId: 'c1',
        personId: 'existing-person',
      });
      prisma.couple.create.mockResolvedValue({
        id: 'cp-new',
        spouse1Id: 'n1',
        spouse2Id: 'new-node',
      });

      await service.addSpouse('c1', 'n1', { name: 'Test', userId: 'u1' });

      // No CrossCommunityLink should be created
      expect(prisma.crossCommunityLink).toBeUndefined();
    });
  });

  describe('addChild (cross-community)', () => {
    it('creates child TreeNode in both communities when spouse spans communities', async () => {
      // Setup: couple in community c1
      prisma.couple.findUnique.mockResolvedValue({
        id: 'cp1',
        communityId: 'c1',
        spouse1Id: 'n1',
        spouse2Id: 'n2',
      });
      prisma.coupleChild.count.mockResolvedValue(0);
      prisma.person.count.mockResolvedValue(0);

      // Create child Person
      prisma.person.create.mockResolvedValue({
        id: 'child-person',
        profileId: 'child',
        name: 'Child',
      });

      // Create child TreeNode in c1
      prisma.treeNode.create = jest.fn()
        .mockResolvedValueOnce({ id: 'child-node-c1', communityId: 'c1', personId: 'child-person' })
        .mockResolvedValueOnce({ id: 'child-node-c2', communityId: 'c2', personId: 'child-person' });

      prisma.coupleChild.create.mockResolvedValue({});

      // Spouse1 has nodes in c1 and c2
      prisma.treeNode.findUnique
        .mockResolvedValueOnce({
          id: 'n1',
          communityId: 'c1',
          personId: 'p1',
          person: {
            id: 'p1',
            treeNodes: [
              { id: 'n1', communityId: 'c1' },
              { id: 'n1-c2', communityId: 'c2' },
            ],
          },
        })
        .mockResolvedValueOnce({
          id: 'n2',
          communityId: 'c1',
          personId: 'p2',
          person: {
            id: 'p2',
            treeNodes: [
              { id: 'n2', communityId: 'c1' },
              { id: 'n2-c2', communityId: 'c2' },
            ],
          },
        });

      // Couple exists in c2 between the two spouses' other nodes
      prisma.couple.findFirst = jest.fn().mockResolvedValue({
        id: 'cp2',
        communityId: 'c2',
        spouse1Id: 'n1-c2',
        spouse2Id: 'n2-c2',
      });

      // Count children in other couple
      prisma.coupleChild.count
        .mockResolvedValueOnce(0) // first call for c1 child count
        .mockResolvedValueOnce(1); // second call for c2 child count

      const result = await service.addChild('c1', 'cp1', { name: 'Child' });

      // Should create TreeNode in both communities
      expect(prisma.treeNode.create).toHaveBeenCalledTimes(2);
      expect(prisma.coupleChild.create).toHaveBeenCalledTimes(2);
      expect(result.childNodeId).toBe('child-node-c1');
    });

    it('all created in single transaction', async () => {
      // The $transaction mock wraps the callback — if it's called, everything inside is transactional
      prisma.couple.findUnique.mockResolvedValue({
        id: 'cp1',
        communityId: 'c1',
        spouse1Id: 'n1',
        spouse2Id: 'n2',
      });
      prisma.coupleChild.count.mockResolvedValue(0);
      prisma.person.count.mockResolvedValue(0);
      prisma.person.create.mockResolvedValue({ id: 'p', profileId: 'c', name: 'C' });
      prisma.treeNode.create = jest.fn().mockResolvedValue({ id: 'cn', communityId: 'c1', personId: 'p' });
      prisma.coupleChild.create.mockResolvedValue({});
      prisma.treeNode.findUnique
        .mockResolvedValueOnce({ id: 'n1', person: { id: 'p1', treeNodes: [{ id: 'n1', communityId: 'c1' }] } })
        .mockResolvedValueOnce({ id: 'n2', person: { id: 'p2', treeNodes: [{ id: 'n2', communityId: 'c1' }] } });

      await service.addChild('c1', 'cp1', { name: 'Child' });

      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });
});
