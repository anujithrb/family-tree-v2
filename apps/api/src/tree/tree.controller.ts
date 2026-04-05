import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { TreeService } from './tree.service';
import { CommunityAdminGuard } from '../communities/community-admin.guard';
import { CommunityMemberGuard } from '../communities/community-member.guard';
import { CurrentUser, RequestUser } from '../auth/user.decorator';
import { AddSpouseDto } from './dto/add-spouse.dto';
import { AddChildDto } from './dto/add-child.dto';
import { AddParentsDto } from './dto/add-parents.dto';
import { AddSiblingDto } from './dto/add-sibling.dto';
import { EditNodeDto } from './dto/edit-node.dto';

@Controller('communities/:id/tree')
export class TreeController {
  constructor(private readonly treeService: TreeService) {}

  @Get()
  @UseGuards(CommunityMemberGuard)
  async getTree(@Param('id') communityId: string) {
    return this.treeService.getTree(communityId);
  }

  @Post('add-spouse')
  @UseGuards(CommunityAdminGuard)
  async addSpouse(
    @Param('id') communityId: string,
    @Body() dto: AddSpouseDto,
  ) {
    return this.treeService.addSpouse(communityId, dto.treeNodeId, {
      name: dto.name,
      gender: dto.gender,
      birthYear: dto.birthYear,
      isDeceased: dto.isDeceased,
      userId: dto.userId,
    });
  }

  @Post('add-child')
  @UseGuards(CommunityAdminGuard)
  async addChild(
    @Param('id') communityId: string,
    @Body() dto: AddChildDto,
  ) {
    return this.treeService.addChild(communityId, dto.coupleId, {
      name: dto.name,
      gender: dto.gender,
      birthYear: dto.birthYear,
      isDeceased: dto.isDeceased,
    });
  }

  @Post('add-parents')
  @UseGuards(CommunityAdminGuard)
  async addParents(
    @Param('id') communityId: string,
    @Body() dto: AddParentsDto,
  ) {
    return this.treeService.addParents(communityId, dto.treeNodeId, {
      parent1: dto.parent1,
      parent2: dto.parent2,
    });
  }

  @Post('add-sibling')
  @UseGuards(CommunityAdminGuard)
  async addSibling(
    @Param('id') communityId: string,
    @Body() dto: AddSiblingDto,
  ) {
    return this.treeService.addSibling(communityId, dto.treeNodeId, {
      name: dto.name,
      gender: dto.gender,
      birthYear: dto.birthYear,
      isDeceased: dto.isDeceased,
    });
  }

  @Put('nodes/:nodeId')
  @UseGuards(CommunityAdminGuard)
  async editNode(
    @Param('id') communityId: string,
    @Param('nodeId') nodeId: string,
    @Body() dto: EditNodeDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.treeService.editNode(communityId, nodeId, dto, user.id);
  }

  @Delete('nodes/:nodeId')
  @UseGuards(CommunityAdminGuard)
  async removeNode(
    @Param('id') communityId: string,
    @Param('nodeId') nodeId: string,
  ) {
    return this.treeService.removeNode(communityId, nodeId);
  }
}
