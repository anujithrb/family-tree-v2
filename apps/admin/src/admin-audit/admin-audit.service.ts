import { Injectable } from '@nestjs/common';
import { PrismaService } from '@family-tree/database';

export interface AuditFiltersDto {
  actorType?: string;
  action?: string;
  from?: string;
  to?: string;
  page?: number;
}

@Injectable()
export class AdminAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const [communityCount, userCount, personCount, pendingLinksCount] = await Promise.all([
      this.prisma.community.count(),
      this.prisma.user.count(),
      this.prisma.person.count(),
      this.prisma.crossCommunityLink.count({ where: { status: 'pending' } }),
    ]);

    return { communityCount, userCount, personCount, pendingLinksCount };
  }

  async getAuditLog(filters: AuditFiltersDto) {
    const page = filters.page || 1;
    const where: any = {};

    if (filters.actorType) where.actorType = filters.actorType;
    if (filters.action) where.action = filters.action;
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = new Date(filters.from);
      if (filters.to) where.createdAt.lte = new Date(filters.to);
    }

    const [actions, total] = await Promise.all([
      this.prisma.crossCommunityLinkAction.findMany({
        where,
        include: {
          link: {
            include: {
              treeNodeA: { include: { person: true, community: true } },
              treeNodeB: { include: { person: true, community: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: (page - 1) * 50,
      }),
      this.prisma.crossCommunityLinkAction.count({ where }),
    ]);

    return { actions, total, page };
  }
}
