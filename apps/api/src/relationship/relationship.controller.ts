import {
  Controller,
  Get,
  Query,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser, RequestUser } from '../auth/user.decorator';
import { RelationshipService } from './relationship.service';

@Controller('relationship')
@UseGuards(AuthGuard)
export class RelationshipController {
  constructor(private readonly relationshipService: RelationshipService) {}

  @Get()
  async findRelationship(
    @Query('a') nodeAId: string,
    @Query('b') nodeBId: string,
    @CurrentUser() user: RequestUser,
  ) {
    if (!nodeAId || !nodeBId) {
      throw new BadRequestException('Both "a" and "b" query params required');
    }

    const nodeA = await this.relationshipService.getNode(nodeAId);
    const nodeB = await this.relationshipService.getNode(nodeBId);

    if (!nodeA || !nodeB) throw new NotFoundException('TreeNode not found');

    let result;
    if (nodeA.communityId === nodeB.communityId) {
      result = await this.relationshipService.findWithinCommunity(nodeAId, nodeBId);
    } else {
      result = await this.relationshipService.findAcrossCommunities(nodeAId, nodeBId);
    }

    if (!result) return { path: null, message: 'No relationship found' };

    const filteredPath = await this.relationshipService.filterPathForPrivacy(
      result.path,
      user.id,
    );

    return { path: filteredPath, edges: result.edges };
  }
}
