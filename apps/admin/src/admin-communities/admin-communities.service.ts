import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@family-tree/database';

@Injectable()
export class AdminCommunitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const communities = await this.prisma.community.findMany({
      include: {
        _count: { select: { treeNodes: true } },
        admins: { include: { user: { select: { id: true, email: true, displayName: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return communities;
  }

  async getById(id: string) {
    const community = await this.prisma.community.findUnique({
      where: { id },
      include: {
        _count: { select: { treeNodes: true, couples: true } },
        admins: { include: { user: { select: { id: true, email: true, displayName: true } } } },
      },
    });
    if (!community) throw new NotFoundException('Community not found');
    return community;
  }

  async create(name: string) {
    return this.prisma.community.create({ data: { name } });
  }

  async update(id: string, dto: { name?: string }) {
    const community = await this.prisma.community.findUnique({ where: { id } });
    if (!community) throw new NotFoundException('Community not found');

    return this.prisma.community.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const community = await this.prisma.community.findUnique({ where: { id } });
    if (!community) throw new NotFoundException('Community not found');

    // Cascade: CoupleChild → Couple → TreeNode → Person (where no other nodes)
    // Prisma cascade handles CoupleChild via Couple, and communityAdmin via Community
    await this.prisma.community.delete({ where: { id } });
  }

  async assignAdmins(communityId: string, admins: Array<{ userId: string; treeNodeId: string }>) {
    const community = await this.prisma.community.findUnique({ where: { id: communityId } });
    if (!community) throw new NotFoundException('Community not found');

    // Replace all community admins
    await this.prisma.communityAdmin.deleteMany({ where: { communityId } });

    if (admins.length > 0) {
      await this.prisma.communityAdmin.createMany({
        data: admins.map(({ userId, treeNodeId }) => ({ communityId, userId, treeNodeId })),
      });
    }

    return this.getById(communityId);
  }
}
