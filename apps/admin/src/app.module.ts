import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@family-tree/database';
import { AdminAuthModule } from './admin-auth/admin-auth.module';
import { AdminManagementModule } from './admin-management/admin-management.module';
import { AdminCommunitiesModule } from './admin-communities/admin-communities.module';
import { AdminTreeModule } from './admin-tree/admin-tree.module';
import { AdminUsersModule } from './admin-users/admin-users.module';
import { AdminPersonsModule } from './admin-persons/admin-persons.module';
import { AdminLinksModule } from './admin-links/admin-links.module';
import { AdminAuditModule } from './admin-audit/admin-audit.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    PrismaModule,
    AdminAuthModule,
    AdminManagementModule,
    AdminCommunitiesModule,
    AdminTreeModule,
    AdminUsersModule,
    AdminPersonsModule,
    AdminLinksModule,
    AdminAuditModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
