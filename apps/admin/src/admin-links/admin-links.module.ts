import { Module } from '@nestjs/common';
import { AdminLinksService } from './admin-links.service';
import { AdminLinksController } from './admin-links.controller';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';

@Module({
  imports: [AdminAuthModule],
  providers: [AdminLinksService],
  controllers: [AdminLinksController],
})
export class AdminLinksModule {}
