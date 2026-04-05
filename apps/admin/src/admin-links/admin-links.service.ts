import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@family-tree/database';

@Injectable()
export class AdminLinksService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filters: { status?: string; page?: number }) {
    const page = filters.page || 1;
    const where: any = {};
    if (filters.status) where.status = filters.status;

    const [links, total] = await Promise.all([
      this.prisma.crossCommunityLink.findMany({
        where,
        include: {
          treeNodeA: { include: { person: true, community: true } },
          treeNodeB: { include: { person: true, community: true } },
          actions: { orderBy: { createdAt: 'desc' }, take: 5 },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: (page - 1) * 50,
      }),
      this.prisma.crossCommunityLink.count({ where }),
    ]);

    return { links, total, page };
  }

  async createApproved(treeNodeAId: string, treeNodeBId: string, adminId: string) {
    const nodeA = await this.prisma.treeNode.findUnique({ where: { id: treeNodeAId } });
    if (!nodeA) throw new NotFoundException('TreeNode A not found');

    const nodeB = await this.prisma.treeNode.findUnique({ where: { id: treeNodeBId } });
    if (!nodeB) throw new NotFoundException('TreeNode B not found');

    const existing = await this.prisma.crossCommunityLink.findFirst({
      where: {
        OR: [
          { treeNodeAId, treeNodeBId },
          { treeNodeAId: treeNodeBId, treeNodeBId: treeNodeAId },
        ],
      },
    });
    if (existing) throw new ConflictException('Link already exists between these nodes');

    return this.prisma.$transaction(async (tx) => {
      const link = await tx.crossCommunityLink.create({
        data: { treeNodeAId, treeNodeBId, status: 'approved' },
      });

      await tx.crossCommunityLinkAction.create({
        data: { linkId: link.id, action: 'approved', actorType: 'admin', actorId: adminId },
      });

      return link;
    });
  }

  async overrideStatus(id: string, status: string, adminId: string) {
    const link = await this.prisma.crossCommunityLink.findUnique({ where: { id } });
    if (!link) throw new NotFoundException('Link not found');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.crossCommunityLink.update({
        where: { id },
        data: { status },
      });

      await tx.crossCommunityLinkAction.create({
        data: { linkId: id, action: status, actorType: 'admin', actorId: adminId },
      });

      return updated;
    });
  }

  async remove(id: string) {
    const link = await this.prisma.crossCommunityLink.findUnique({ where: { id } });
    if (!link) throw new NotFoundException('Link not found');

    await this.prisma.crossCommunityLink.delete({ where: { id } });
  }
}
