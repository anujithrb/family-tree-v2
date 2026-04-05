import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { CommunitiesService } from './communities.service';
import { CreateCommunityDto } from './dto/create-community.dto';
import { CurrentUser, RequestUser } from '../auth/user.decorator';
import { CommunityMemberGuard } from './community-member.guard';

@Controller('communities')
export class CommunitiesController {
  constructor(private readonly communitiesService: CommunitiesService) {}

  @Get()
  async list(@CurrentUser() user: RequestUser) {
    return this.communitiesService.listCommunities(user.id);
  }

  @Post()
  async create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateCommunityDto,
  ) {
    return this.communitiesService.createCommunity(dto, user.id);
  }

  @Get(':id')
  @UseGuards(CommunityMemberGuard)
  async get(@Param('id') id: string) {
    return this.communitiesService.getCommunity(id);
  }
}
