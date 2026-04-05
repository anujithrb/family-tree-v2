import { Test } from '@nestjs/testing';
import { RelationshipService } from './relationship.service';
import { PrismaService } from '@family-tree/database';

describe('RelationshipService', () => {
  let service: RelationshipService;
  let prisma: any;

  // Community structure:
  //   Grandpa(n1) + Grandma(n2)
  //          |
  //   Father(n3) + Mother(n4)
  //          |
  //   Child1(n5)   Child2(n6)

  const communityId = 'comm1';

  const mockTreeNodes = [
    { id: 'n1', communityId, personId: 'p1', person: { id: 'p1', name: 'Grandpa' } },
    { id: 'n2', communityId, personId: 'p2', person: { id: 'p2', name: 'Grandma' } },
    { id: 'n3', communityId, personId: 'p3', person: { id: 'p3', name: 'Father' } },
    { id: 'n4', communityId, personId: 'p4', person: { id: 'p4', name: 'Mother' } },
    { id: 'n5', communityId, personId: 'p5', person: { id: 'p5', name: 'Child1' } },
    { id: 'n6', communityId, personId: 'p6', person: { id: 'p6', name: 'Child2' } },
  ];

  const mockCouples = [
    { id: 'cp1', communityId, spouse1Id: 'n1', spouse2Id: 'n2' }, // Grandpa+Grandma
    { id: 'cp2', communityId, spouse1Id: 'n3', spouse2Id: 'n4' }, // Father+Mother
  ];

  const mockCoupleChildren = [
    { coupleId: 'cp1', childId: 'n3', sortOrder: 0 }, // Father is child of Grandpa+Grandma
    { coupleId: 'cp2', childId: 'n5', sortOrder: 0 }, // Child1 is child of Father+Mother
    { coupleId: 'cp2', childId: 'n6', sortOrder: 1 }, // Child2 is child of Father+Mother
  ];

  beforeEach(async () => {
    prisma = {
      treeNode: {
        findUnique: jest.fn((args: any) => {
          const node = mockTreeNodes.find((n) => n.id === args.where.id);
          return Promise.resolve(node || null);
        }),
        findMany: jest.fn().mockResolvedValue(mockTreeNodes),
      },
      couple: {
        findMany: jest.fn().mockResolvedValue(mockCouples),
      },
      coupleChild: {
        findMany: jest.fn().mockResolvedValue(mockCoupleChildren),
      },
      person: {
        findUnique: jest.fn(),
      },
      crossCommunityLink: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      communityAdmin: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        RelationshipService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(RelationshipService);
  });

  describe('findWithinCommunity', () => {
    it('finds spouse relationship (direct edge)', async () => {
      const result = await service.findWithinCommunity('n3', 'n4');
      expect(result).not.toBeNull();
      expect(result!.path).toContain('n3');
      expect(result!.path).toContain('n4');
      expect(result!.path).toHaveLength(2);
      expect(result!.edges[0].type).toBe('spouse');
    });

    it('finds parent-child relationship', async () => {
      const result = await service.findWithinCommunity('n3', 'n5');
      expect(result).not.toBeNull();
      expect(result!.path).toEqual(['n3', 'n5']);
      expect(result!.edges[0].type).toBe('parent-child');
    });

    it('finds grandparent relationship', async () => {
      const result = await service.findWithinCommunity('n1', 'n5');
      expect(result).not.toBeNull();
      // Path: Grandpa → Father → Child1
      expect(result!.path).toEqual(['n1', 'n3', 'n5']);
    });

    it('finds sibling relationship', async () => {
      const result = await service.findWithinCommunity('n5', 'n6');
      expect(result).not.toBeNull();
      // Path: Child1 → Father (or Mother) → Child2
      expect(result!.path).toHaveLength(3);
      expect(result!.path[0]).toBe('n5');
      expect(result!.path[2]).toBe('n6');
      // Middle node should be Father or Mother
      expect(['n3', 'n4']).toContain(result!.path[1]);
    });

    it('finds in-law relationship', async () => {
      const result = await service.findWithinCommunity('n1', 'n4');
      expect(result).not.toBeNull();
      // Path: Grandpa → Father → Mother
      expect(result!.path).toEqual(['n1', 'n3', 'n4']);
    });

    it('returns null when no path exists', async () => {
      // Add a disconnected node
      const disconnectedNodes = [
        ...mockTreeNodes,
        { id: 'n99', communityId, personId: 'p99', person: { id: 'p99', name: 'Isolated' } },
      ];
      prisma.treeNode.findMany.mockResolvedValue(disconnectedNodes);
      prisma.treeNode.findUnique.mockImplementation((args: any) => {
        const node = disconnectedNodes.find((n) => n.id === args.where.id);
        return Promise.resolve(node || null);
      });

      const result = await service.findWithinCommunity('n1', 'n99');
      expect(result).toBeNull();
    });
  });

  describe('findAcrossCommunities', () => {
    // Community X:  PersonA(nxA) + PersonB(nxB)
    // Community Y:  PersonB(nyB) + PersonC(nyC) → PersonD(nyD)
    // PersonB is the same Person in both communities (shared personId 'pB')

    const commX = 'commX';
    const commY = 'commY';

    const crossTreeNodes = [
      { id: 'nxA', communityId: commX, personId: 'pA' },
      { id: 'nxB', communityId: commX, personId: 'pB' },
      { id: 'nyB', communityId: commY, personId: 'pB' },
      { id: 'nyC', communityId: commY, personId: 'pC' },
      { id: 'nyD', communityId: commY, personId: 'pD' },
    ];

    const crossCouples = [
      { id: 'cpX', communityId: commX, spouse1Id: 'nxA', spouse2Id: 'nxB' },
      { id: 'cpY', communityId: commY, spouse1Id: 'nyB', spouse2Id: 'nyC' },
    ];

    const crossCoupleChildren = [
      { coupleId: 'cpY', childId: 'nyD', sortOrder: 0 },
    ];

    beforeEach(() => {
      // Override mocks for cross-community tests
      prisma.treeNode.findUnique.mockImplementation((args: any) => {
        const node = crossTreeNodes.find((n) => n.id === args.where.id);
        if (!node) return Promise.resolve(null);
        // Include person with treeNodes for cross-community detection
        const personNodes = crossTreeNodes.filter((n) => n.personId === node.personId);
        return Promise.resolve({
          ...node,
          person: {
            id: node.personId,
            name: `Person-${node.personId}`,
            treeNodes: personNodes,
          },
          community: { id: node.communityId, name: `Comm-${node.communityId}` },
        });
      });

      prisma.treeNode.findMany.mockImplementation((args: any) => {
        const commId = args.where.communityId;
        return Promise.resolve(crossTreeNodes.filter((n) => n.communityId === commId));
      });

      prisma.couple.findMany.mockImplementation((args: any) => {
        const commId = args.where.communityId;
        return Promise.resolve(crossCouples.filter((c) => c.communityId === commId));
      });

      prisma.coupleChild.findMany.mockImplementation((args: any) => {
        const commId = args.where.couple?.communityId;
        return Promise.resolve(crossCoupleChildren.filter((cc) => {
          const couple = crossCouples.find((c) => c.id === cc.coupleId);
          return couple && couple.communityId === commId;
        }));
      });
    });

    it('finds cross-community relationship via shared Person', async () => {
      prisma.crossCommunityLink.findMany.mockResolvedValue([]);

      // PersonA (commX) → PersonD (commY)
      // Path: nxA → nxB (spouse) → nyB (cross-community, same person) → nyD (parent-child via nyC parent)
      // Or: nxA → nxB → nyB → nyC → nyD
      const result = await service.findAcrossCommunities('nxA', 'nyD');

      expect(result).not.toBeNull();
      expect(result!.path[0]).toBe('nxA');
      expect(result!.path[result!.path.length - 1]).toBe('nyD');
      // Should cross community boundary
      const crossEdge = result!.edges.find((e) => e.type === 'cross-community');
      expect(crossEdge).toBeDefined();
    });

    it('finds cross-community relationship via explicit link (non-users)', async () => {
      // Override: pB person has only one treeNode per community (no shared person)
      const linkNodes = [
        { id: 'nxA', communityId: commX, personId: 'pA' },
        { id: 'nxB', communityId: commX, personId: 'pB-x' }, // Different person
        { id: 'nyB', communityId: commY, personId: 'pB-y' }, // Different person
        { id: 'nyC', communityId: commY, personId: 'pC' },
        { id: 'nyD', communityId: commY, personId: 'pD' },
      ];

      prisma.treeNode.findUnique.mockImplementation((args: any) => {
        const node = linkNodes.find((n) => n.id === args.where.id);
        if (!node) return Promise.resolve(null);
        const personNodes = linkNodes.filter((n) => n.personId === node.personId);
        return Promise.resolve({
          ...node,
          person: { id: node.personId, name: `Person-${node.personId}`, treeNodes: personNodes },
          community: { id: node.communityId, name: `Comm-${node.communityId}` },
        });
      });

      prisma.treeNode.findMany.mockImplementation((args: any) => {
        const commId = args.where.communityId;
        return Promise.resolve(linkNodes.filter((n) => n.communityId === commId));
      });

      // Approved cross-community link between nxB and nyB
      prisma.crossCommunityLink.findMany.mockImplementation((args: any) => {
        if (args.where?.status === 'approved') {
          const nodeId = args.where.OR?.[0]?.treeNodeAId || args.where.OR?.[0]?.treeNodeBId;
          if (nodeId === 'nxB' || nodeId === 'nyB') {
            return Promise.resolve([{
              id: 'link1',
              treeNodeAId: 'nxB',
              treeNodeBId: 'nyB',
              status: 'approved',
            }]);
          }
        }
        return Promise.resolve([]);
      });

      const result = await service.findAcrossCommunities('nxA', 'nyD');

      expect(result).not.toBeNull();
      expect(result!.path[0]).toBe('nxA');
      expect(result!.path[result!.path.length - 1]).toBe('nyD');
    });

    it('does not traverse pending or rejected links', async () => {
      // Same setup as above but link is pending
      const linkNodes = [
        { id: 'nxA', communityId: commX, personId: 'pA' },
        { id: 'nxB', communityId: commX, personId: 'pB-x' },
        { id: 'nyB', communityId: commY, personId: 'pB-y' },
        { id: 'nyC', communityId: commY, personId: 'pC' },
        { id: 'nyD', communityId: commY, personId: 'pD' },
      ];

      prisma.treeNode.findUnique.mockImplementation((args: any) => {
        const node = linkNodes.find((n) => n.id === args.where.id);
        if (!node) return Promise.resolve(null);
        const personNodes = linkNodes.filter((n) => n.personId === node.personId);
        return Promise.resolve({
          ...node,
          person: { id: node.personId, name: `Person-${node.personId}`, treeNodes: personNodes },
          community: { id: node.communityId, name: `Comm-${node.communityId}` },
        });
      });

      prisma.treeNode.findMany.mockImplementation((args: any) => {
        const commId = args.where.communityId;
        return Promise.resolve(linkNodes.filter((n) => n.communityId === commId));
      });

      // Only pending/rejected links — should NOT be traversed
      prisma.crossCommunityLink.findMany.mockResolvedValue([]);

      const result = await service.findAcrossCommunities('nxA', 'nyD');
      expect(result).toBeNull();
    });
  });

  describe('filterPathForPrivacy', () => {
    beforeEach(() => {
      // Override treeNode.findUnique for privacy tests
      prisma.treeNode.findUnique.mockImplementation((args: any) => {
        const nodes: Record<string, any> = {
          n1: {
            id: 'n1',
            communityId: 'comm1',
            personId: 'p1',
            person: { id: 'p1', name: 'Alice', birthYear: 1980, gender: 'F', profileId: 'alice' },
            community: { id: 'comm1', name: 'Community 1' },
          },
          n2: {
            id: 'n2',
            communityId: 'comm2',
            personId: 'p2',
            person: { id: 'p2', name: 'Bob', birthYear: 1985, gender: 'M', profileId: 'bob' },
            community: { id: 'comm2', name: 'Community 2' },
          },
          n3: {
            id: 'n3',
            communityId: 'comm3',
            personId: 'p3',
            person: { id: 'p3', name: 'Charlie', birthYear: 1990, gender: 'M', profileId: 'charlie' },
            community: { id: 'comm3', name: 'Community 3' },
          },
        };
        return Promise.resolve(nodes[args.where.id] || null);
      });
    });

    it('returns full detail for nodes in user communities', async () => {
      prisma.person.findFirst = jest.fn().mockResolvedValue({
        id: 'pUser',
        treeNodes: [{ communityId: 'comm1' }],
      });
      prisma.communityAdmin.findMany.mockResolvedValue([]);

      const result = await service.filterPathForPrivacy(['n1'], 'user1');

      expect(result).toHaveLength(1);
      expect(result[0].birthYear).toBe(1980);
      expect(result[0].gender).toBe('F');
      expect(result[0].profileId).toBe('alice');
    });

    it('returns name only for nodes in other communities', async () => {
      prisma.person.findFirst = jest.fn().mockResolvedValue({
        id: 'pUser',
        treeNodes: [{ communityId: 'comm1' }],
      });
      prisma.communityAdmin.findMany.mockResolvedValue([]);

      const result = await service.filterPathForPrivacy(['n2'], 'user1');

      expect(result).toHaveLength(1);
      expect(result[0].personName).toBe('Bob');
      expect(result[0].communityName).toBe('Community 2');
      expect(result[0].birthYear).toBeUndefined();
      expect(result[0].gender).toBeUndefined();
      expect(result[0].profileId).toBeUndefined();
    });

    it('handles path spanning 3+ communities with mixed visibility', async () => {
      // User is member of comm1 and comm3 (via admin), but not comm2
      prisma.person.findFirst = jest.fn().mockResolvedValue({
        id: 'pUser',
        treeNodes: [{ communityId: 'comm1' }],
      });
      prisma.communityAdmin.findMany.mockResolvedValue([
        { communityId: 'comm3', userId: 'user1' },
      ]);

      const result = await service.filterPathForPrivacy(['n1', 'n2', 'n3'], 'user1');

      expect(result).toHaveLength(3);
      // n1 (comm1) → full detail
      expect(result[0].profileId).toBe('alice');
      // n2 (comm2) → name only
      expect(result[1].profileId).toBeUndefined();
      expect(result[1].personName).toBe('Bob');
      // n3 (comm3) → full detail (admin)
      expect(result[2].profileId).toBe('charlie');
    });
  });
});
