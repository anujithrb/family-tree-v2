import { Module } from '@nestjs/common';
import { AdminTreeService } from './tree.service';
import { AdminTreeController } from './admin-tree.controller';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';

@Module({
  imports: [AdminAuthModule],
  providers: [AdminTreeService],
  controllers: [AdminTreeController],
})
export class AdminTreeModule {}
