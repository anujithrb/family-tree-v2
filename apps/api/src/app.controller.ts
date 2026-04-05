import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '@family-tree/database';
import { Public } from './auth/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('health')
  async health() {
    const communityCount = await this.prisma.community.count();
    return {
      status: 'ok',
      service: 'family-tree-api',
      database: 'connected',
      communities: communityCount,
    };
  }
}
