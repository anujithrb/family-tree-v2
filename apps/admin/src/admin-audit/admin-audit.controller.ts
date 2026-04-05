import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from '../admin-auth/guards/admin-auth.guard';
import { AdminAuditService, AuditFiltersDto } from './admin-audit.service';

@Controller('')
@UseGuards(AdminAuthGuard)
export class AdminAuditController {
  constructor(private readonly adminAuditService: AdminAuditService) {}

  @Get('dashboard')
  getDashboard() {
    return this.adminAuditService.getDashboard();
  }

  @Get('audit')
  getAuditLog(@Query() filters: AuditFiltersDto) {
    return this.adminAuditService.getAuditLog(filters);
  }
}
