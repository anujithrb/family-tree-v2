import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '@family-tree/database';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  async health() {
    const adminCount = await this.prisma.adminUser.count();
    return {
      status: 'ok',
      service: 'family-tree-admin',
      database: 'connected',
      adminUsers: adminCount,
    };
  }
}
