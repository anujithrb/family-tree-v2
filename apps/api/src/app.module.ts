import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@family-tree/database';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CommunitiesModule } from './communities/communities.module';
import { TreeModule } from './tree/tree.module';
import { LinksModule } from './links/links.module';
import { RelationshipModule } from './relationship/relationship.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CommunitiesModule,
    TreeModule,
    LinksModule,
    RelationshipModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
