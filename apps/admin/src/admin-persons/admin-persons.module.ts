import { Module } from '@nestjs/common';
import { AdminPersonsService } from './admin-persons.service';
import { AdminPersonsController } from './admin-persons.controller';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';

@Module({
  imports: [AdminAuthModule],
  providers: [AdminPersonsService],
  controllers: [AdminPersonsController],
})
export class AdminPersonsModule {}
