import {
  Controller,
  Post,
  Put,
  Get,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser, RequestUser } from '../auth/user.decorator';
import { LinksService } from './links.service';
import { RequestLinkDto } from './dto/request-link.dto';

@Controller('links')
@UseGuards(AuthGuard)
export class LinksController {
  constructor(private readonly linksService: LinksService) {}

  @Post('request')
  async requestLink(
    @Body() dto: RequestLinkDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.linksService.requestLink(dto, user.id);
  }

  @Put(':id/approve')
  async approveLink(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.linksService.approveLink(id, user.id);
  }

  @Put(':id/reject')
  async rejectLink(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.linksService.rejectLink(id, user.id);
  }

  @Get('pending')
  async getPendingLinks(@CurrentUser() user: RequestUser) {
    return this.linksService.getPendingLinks(user.id);
  }
}
