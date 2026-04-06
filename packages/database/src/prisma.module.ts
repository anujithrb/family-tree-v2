import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { TreeOperationsService } from './tree-operations.service';

@Global()
@Module({
  providers: [PrismaService, TreeOperationsService],
  exports: [PrismaService, TreeOperationsService],
})
export class PrismaModule {}
