import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '@family-tree/database';

@Injectable()
export class CommunityAdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const communityId = request.params.id;
    const userId = request.user?.id;

    if (!communityId || !userId) {
      throw new ForbiddenException('Missing community or user context');
    }

    const admin = await this.prisma.communityAdmin.findUnique({
      where: { communityId_userId: { communityId, userId } },
    });

    if (!admin) {
      throw new ForbiddenException('You are not an admin of this community');
    }

    request.communityId = communityId;
    request.adminRole = admin.role;

    return true;
  }
}
