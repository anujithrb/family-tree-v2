import { Module } from '@nestjs/common';
import { AdminManagementService } from './admin-management.service';
import { AdminManagementController } from './admin-management.controller';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';

@Module({
  imports: [AdminAuthModule],
  providers: [AdminManagementService],
  controllers: [AdminManagementController],
})
export class AdminManagementModule {}
