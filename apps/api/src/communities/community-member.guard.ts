import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@family-tree/database';

@Injectable()
export class CommunityMemberGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const communityId = request.params.id;
    const userId = request.user?.id;

    if (!communityId || !userId) {
      throw new ForbiddenException('Missing community or user context');
    }

    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
    });
    if (!community) {
      throw new NotFoundException('Community not found');
    }

    // Check if user has a Person with a TreeNode in this community
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { person: { include: { treeNodes: { where: { communityId } } } } },
    });

    if (!user?.person?.treeNodes?.length) {
      throw new ForbiddenException('You are not a member of this community');
    }

    // Attach communityId and user's treeNodeId to request for downstream use
    request.communityId = communityId;
    request.userTreeNodeId = user.person.treeNodes[0].id;

    return true;
  }
}
