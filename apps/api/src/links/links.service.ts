import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@family-tree/database';
import { RequestLinkDto } from './dto/request-link.dto';

@Injectable()
export class LinksService {
  constructor(private readonly prisma: PrismaService) {}

  async requestLink(dto: RequestLinkDto, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const [nodeA, nodeB] = await Promise.all([
        tx.treeNode.findUnique({
          where: { id: dto.treeNodeAId },
          include: { person: { include: { user: true } }, community: true },
        }),
        tx.treeNode.findUnique({
          where: { id: dto.treeNodeBId },
          include: { person: { include: { user: true } }, community: true },
        }),
      ]);

      if (!nodeA || !nodeB) {
        throw new NotFoundException('One or both TreeNodes not found');
      }

      // Validate actor is admin of nodeA's community
      const adminRoles = await tx.communityAdmin.findMany({
        where: { userId: actorId },
      });
      const adminCommunityIds = adminRoles.map((a) => a.communityId);

      if (!adminCommunityIds.includes(nodeA.communityId)) {
        throw new BadRequestException(
          'You must be an admin of the requesting community',
        );
      }

      if (nodeA.communityId === nodeB.communityId) {
        throw new BadRequestException(
          'Both TreeNodes are in the same community. Cross-community link not needed.',
        );
      }

      if (nodeA.person.user || nodeB.person.user) {
        throw new BadRequestException(
          'Cannot create explicit link for registered users. Cross-community identity is automatic via shared Person.',
        );
      }

      const existing = await tx.crossCommunityLink.findFirst({
        where: {
          OR: [
            { treeNodeAId: dto.treeNodeAId, treeNodeBId: dto.treeNodeBId },
            { treeNodeAId: dto.treeNodeBId, treeNodeBId: dto.treeNodeAId },
          ],
        },
      });
      if (existing) {
        throw new ConflictException(
          'A link already exists between these TreeNodes',
        );
      }

      const link = await tx.crossCommunityLink.create({
        data: {
          treeNodeAId: dto.treeNodeAId,
          treeNodeBId: dto.treeNodeBId,
          status: 'pending',
        },
      });

      await tx.crossCommunityLinkAction.create({
        data: {
          linkId: link.id,
          action: 'requested',
          actorType: 'user',
          actorId,
        },
      });

      return link;
    });
  }

  async approveLink(linkId: string, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const link = await tx.crossCommunityLink.findUnique({
        where: { id: linkId },
        include: { treeNodeB: true },
      });
      if (!link) throw new NotFoundException('Link not found');

      // Validate actor is admin of nodeB's community
      const adminRoles = await tx.communityAdmin.findMany({
        where: { userId: actorId },
      });
      const adminCommunityIds = adminRoles.map((a) => a.communityId);

      if (!adminCommunityIds.includes(link.treeNodeB.communityId)) {
        throw new BadRequestException(
          'You must be an admin of the target community to approve',
        );
      }

      if (link.status !== 'pending') {
        throw new BadRequestException('Only pending links can be approved');
      }

      const updated = await tx.crossCommunityLink.update({
        where: { id: linkId },
        data: { status: 'approved' },
      });

      await tx.crossCommunityLinkAction.create({
        data: {
          linkId,
          action: 'approved',
          actorType: 'user',
          actorId,
        },
      });

      return updated;
    });
  }

  async rejectLink(linkId: string, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const link = await tx.crossCommunityLink.findUnique({
        where: { id: linkId },
        include: { treeNodeB: true },
      });
      if (!link) throw new NotFoundException('Link not found');

      const adminRoles = await tx.communityAdmin.findMany({
        where: { userId: actorId },
      });
      const adminCommunityIds = adminRoles.map((a) => a.communityId);

      if (!adminCommunityIds.includes(link.treeNodeB.communityId)) {
        throw new BadRequestException(
          'You must be an admin of the target community to reject',
        );
      }

      if (link.status !== 'pending') {
        throw new BadRequestException('Only pending links can be rejected');
      }

      const updated = await tx.crossCommunityLink.update({
        where: { id: linkId },
        data: { status: 'rejected' },
      });

      await tx.crossCommunityLinkAction.create({
        data: {
          linkId,
          action: 'rejected',
          actorType: 'user',
          actorId,
        },
      });

      return updated;
    });
  }

  async getPendingLinks(userId: string) {
    const adminRoles = await this.prisma.communityAdmin.findMany({
      where: { userId },
    });
    const adminCommunityIds = adminRoles.map((a) => a.communityId);

    return this.prisma.crossCommunityLink.findMany({
      where: {
        status: 'pending',
        treeNodeB: { communityId: { in: adminCommunityIds } },
      },
      include: {
        treeNodeA: {
          include: { person: true, community: true },
        },
        treeNodeB: {
          include: { person: true, community: true },
        },
        actions: { orderBy: { createdAt: 'asc' } },
      },
    });
  }
}
