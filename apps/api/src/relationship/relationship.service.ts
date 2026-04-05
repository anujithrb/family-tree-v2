import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@family-tree/database';

interface GraphEdge {
  nodeId: string;
  edgeType: 'spouse' | 'parent-child' | 'cross-community';
}

export interface PathNode {
  treeNodeId: string;
  personName: string;
  communityId: string;
  communityName: string;
}

export interface RelationshipResult {
  path: string[];
  edges: { from: string; to: string; type: string }[];
}

@Injectable()
export class RelationshipService {
  constructor(private readonly prisma: PrismaService) {}

  async getNode(nodeId: string) {
    return this.prisma.treeNode.findUnique({
      where: { id: nodeId },
      include: { person: true, community: true },
    });
  }

  /**
   * Build undirected adjacency graph from Couples and CoupleChild within a community.
   */
  private async buildCommunityGraph(communityId: string): Promise<{
    adjacency: Map<string, GraphEdge[]>;
  }> {
    const adjacency = new Map<string, GraphEdge[]>();

    const addEdge = (from: string, to: string, type: GraphEdge['edgeType']) => {
      if (!adjacency.has(from)) adjacency.set(from, []);
      if (!adjacency.has(to)) adjacency.set(to, []);
      adjacency.get(from)!.push({ nodeId: to, edgeType: type });
      adjacency.get(to)!.push({ nodeId: from, edgeType: type });
    };

    // Fetch all TreeNodes in community (to register them even if isolated)
    const treeNodes = await this.prisma.treeNode.findMany({
      where: { communityId },
    });
    for (const tn of treeNodes) {
      if (!adjacency.has(tn.id)) adjacency.set(tn.id, []);
    }

    // Spouse edges
    const couples = await this.prisma.couple.findMany({
      where: { communityId },
    });
    for (const c of couples) {
      addEdge(c.spouse1Id, c.spouse2Id, 'spouse');
    }

    // Parent-child edges (both spouses to child)
    const coupleChildren = await this.prisma.coupleChild.findMany({
      where: { couple: { communityId } },
    });
    for (const cc of coupleChildren) {
      const couple = couples.find((c) => c.id === cc.coupleId);
      if (couple) {
        addEdge(couple.spouse1Id, cc.childId, 'parent-child');
        addEdge(couple.spouse2Id, cc.childId, 'parent-child');
      }
    }

    return { adjacency };
  }

  /**
   * BFS shortest path from nodeA to nodeB within a single community.
   */
  async findWithinCommunity(
    nodeAId: string,
    nodeBId: string,
  ): Promise<RelationshipResult | null> {
    const nodeA = await this.prisma.treeNode.findUnique({
      where: { id: nodeAId },
    });
    if (!nodeA) throw new NotFoundException('TreeNode A not found');

    const { adjacency } = await this.buildCommunityGraph(nodeA.communityId);

    return this.bfs(adjacency, nodeAId, nodeBId);
  }

  /**
   * BFS on adjacency list. Returns shortest path and edge types.
   */
  private bfs(
    adjacency: Map<string, GraphEdge[]>,
    startId: string,
    endId: string,
  ): RelationshipResult | null {
    if (startId === endId) {
      return { path: [startId], edges: [] };
    }

    const visited = new Set<string>();
    const parent = new Map<string, { nodeId: string; edgeType: string }>();
    const queue: string[] = [startId];
    visited.add(startId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = adjacency.get(current) || [];

      for (const neighbor of neighbors) {
        if (visited.has(neighbor.nodeId)) continue;
        visited.add(neighbor.nodeId);
        parent.set(neighbor.nodeId, {
          nodeId: current,
          edgeType: neighbor.edgeType,
        });

        if (neighbor.nodeId === endId) {
          return this.reconstructPath(parent, startId, endId);
        }

        queue.push(neighbor.nodeId);
      }
    }

    return null;
  }

  private reconstructPath(
    parent: Map<string, { nodeId: string; edgeType: string }>,
    startId: string,
    endId: string,
  ): RelationshipResult {
    const path: string[] = [];
    const edges: { from: string; to: string; type: string }[] = [];

    let current = endId;
    while (current !== startId) {
      path.unshift(current);
      const p = parent.get(current)!;
      edges.unshift({ from: p.nodeId, to: current, type: p.edgeType });
      current = p.nodeId;
    }
    path.unshift(startId);

    return { path, edges };
  }

  /**
   * Extended BFS that crosses community boundaries.
   * At each TreeNode, checks:
   * 1. Does this Person have TreeNodes in other communities? (shared personId)
   * 2. Does this TreeNode have approved CrossCommunityLinks?
   * Lazily loads community graphs as they are reached.
   */
  async findAcrossCommunities(
    nodeAId: string,
    nodeBId: string,
  ): Promise<RelationshipResult | null> {
    if (nodeAId === nodeBId) {
      return { path: [nodeAId], edges: [] };
    }

    // Loaded community graphs
    const loadedCommunities = new Map<string, Map<string, GraphEdge[]>>();
    // Combined adjacency (includes cross-community edges)
    const globalAdj = new Map<string, GraphEdge[]>();

    const ensureCommunityLoaded = async (communityId: string) => {
      if (loadedCommunities.has(communityId)) return;
      const { adjacency } = await this.buildCommunityGraph(communityId);
      loadedCommunities.set(communityId, adjacency);
      // Merge into global
      for (const [nodeId, edges] of adjacency) {
        if (!globalAdj.has(nodeId)) globalAdj.set(nodeId, []);
        globalAdj.get(nodeId)!.push(...edges);
      }
    };

    // Get starting node's community
    const nodeA = await this.prisma.treeNode.findUnique({
      where: { id: nodeAId },
      include: { person: { include: { treeNodes: true } } },
    });
    if (!nodeA) throw new NotFoundException('TreeNode A not found');
    await ensureCommunityLoaded(nodeA.communityId);

    // Get ending node's community
    const nodeB = await this.prisma.treeNode.findUnique({
      where: { id: nodeBId },
      include: { person: true },
    });
    if (!nodeB) throw new NotFoundException('TreeNode B not found');
    await ensureCommunityLoaded(nodeB.communityId);

    // BFS with lazy community loading
    const visited = new Set<string>();
    const parent = new Map<string, { nodeId: string; edgeType: string }>();
    const queue: string[] = [nodeAId];
    visited.add(nodeAId);

    while (queue.length > 0) {
      const current = queue.shift()!;

      // Check for cross-community edges from this node
      await this.addCrossEdges(current, globalAdj, ensureCommunityLoaded);

      const neighbors = globalAdj.get(current) || [];

      for (const neighbor of neighbors) {
        if (visited.has(neighbor.nodeId)) continue;
        visited.add(neighbor.nodeId);
        parent.set(neighbor.nodeId, {
          nodeId: current,
          edgeType: neighbor.edgeType,
        });

        if (neighbor.nodeId === nodeBId) {
          return this.reconstructPath(parent, nodeAId, nodeBId);
        }

        queue.push(neighbor.nodeId);
      }
    }

    return null;
  }

  /**
   * Adds cross-community edges for a given node:
   * 1. Shared Person (same personId, different community) → cross-community edge
   * 2. Approved CrossCommunityLink → cross-community edge
   */
  private async addCrossEdges(
    nodeId: string,
    globalAdj: Map<string, GraphEdge[]>,
    ensureCommunityLoaded: (communityId: string) => Promise<void>,
  ) {
    const node = await this.prisma.treeNode.findUnique({
      where: { id: nodeId },
      include: { person: { include: { treeNodes: true } } },
    });
    if (!node) return;

    // 1. Shared personId: other TreeNodes for the same Person in other communities
    for (const otherNode of node.person.treeNodes) {
      if (otherNode.id === nodeId) continue;
      await ensureCommunityLoaded(otherNode.communityId);

      if (!globalAdj.has(nodeId)) globalAdj.set(nodeId, []);
      const existing = globalAdj.get(nodeId)!;
      if (!existing.some((e) => e.nodeId === otherNode.id)) {
        existing.push({ nodeId: otherNode.id, edgeType: 'cross-community' });
        if (!globalAdj.has(otherNode.id)) globalAdj.set(otherNode.id, []);
        globalAdj.get(otherNode.id)!.push({ nodeId, edgeType: 'cross-community' });
      }
    }

    // 2. Approved CrossCommunityLinks
    const links = await this.prisma.crossCommunityLink.findMany({
      where: {
        status: 'approved',
        OR: [{ treeNodeAId: nodeId }, { treeNodeBId: nodeId }],
      },
    });

    for (const link of links) {
      const otherId =
        link.treeNodeAId === nodeId ? link.treeNodeBId : link.treeNodeAId;

      const otherNode = await this.prisma.treeNode.findUnique({
        where: { id: otherId },
      });
      if (!otherNode) continue;
      await ensureCommunityLoaded(otherNode.communityId);

      if (!globalAdj.has(nodeId)) globalAdj.set(nodeId, []);
      const existing = globalAdj.get(nodeId)!;
      if (!existing.some((e) => e.nodeId === otherId)) {
        existing.push({ nodeId: otherId, edgeType: 'cross-community' });
        if (!globalAdj.has(otherId)) globalAdj.set(otherId, []);
        globalAdj.get(otherId)!.push({ nodeId, edgeType: 'cross-community' });
      }
    }
  }

  /**
   * Filter relationship path for privacy.
   * Path nodes in communities the requesting user is a member of → full detail.
   * Path nodes in communities the user is NOT a member of → name only.
   */
  async filterPathForPrivacy(
    path: string[],
    requestingUserId: string,
  ): Promise<any[]> {
    // Get all communities the user has TreeNodes in
    const person = await this.prisma.person.findFirst({
      where: { userId: requestingUserId },
      include: { treeNodes: true },
    });

    const userCommunityIds = new Set<string>();
    if (person) {
      for (const tn of person.treeNodes) {
        userCommunityIds.add(tn.communityId);
      }
    }

    // Also include communities where user is admin
    const adminRoles = await this.prisma.communityAdmin.findMany({
      where: { userId: requestingUserId },
    });
    for (const admin of adminRoles) {
      userCommunityIds.add(admin.communityId);
    }

    const result: any[] = [];
    for (const nodeId of path) {
      const node = await this.prisma.treeNode.findUnique({
        where: { id: nodeId },
        include: {
          person: true,
          community: true,
        },
      });

      if (!node) continue;

      if (userCommunityIds.has(node.communityId)) {
        result.push({
          treeNodeId: node.id,
          personName: node.person.name,
          communityId: node.communityId,
          communityName: node.community.name,
          birthYear: node.person.birthYear,
          gender: node.person.gender,
          profileId: node.person.profileId,
        });
      } else {
        result.push({
          treeNodeId: node.id,
          personName: node.person.name,
          communityName: node.community.name,
        });
      }
    }

    return result;
  }
}
