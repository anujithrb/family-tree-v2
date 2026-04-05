import { Module } from '@nestjs/common';
import { AdminCommunitiesService } from './admin-communities.service';
import { AdminCommunitiesController } from './admin-communities.controller';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';

@Module({
  imports: [AdminAuthModule],
  providers: [AdminCommunitiesService],
  controllers: [AdminCommunitiesController],
})
export class AdminCommunitiesModule {}
