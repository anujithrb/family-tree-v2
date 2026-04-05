import { Module } from '@nestjs/common';
import { AdminAuditService } from './admin-audit.service';
import { AdminAuditController } from './admin-audit.controller';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';

@Module({
  imports: [AdminAuthModule],
  providers: [AdminAuditService],
  controllers: [AdminAuditController],
})
export class AdminAuditModule {}
