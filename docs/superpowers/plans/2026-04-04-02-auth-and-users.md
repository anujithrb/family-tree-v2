# Auth & Users Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement magic link invite-only authentication, JWT-based session management, and user profile endpoints for the API server.

**Architecture:** Magic link tokens stored in DB, verified once to create long-lived sessions. JWTs for stateless request auth (short-lived access token refreshed via long-lived DB-stored refresh token). Global auth guard protects all routes except public ones.

**Tech Stack:** NestJS 11, @nestjs/jwt, class-validator, class-transformer, crypto (Node built-in)

**Spec:** `docs/superpowers/specs/2026-04-04-multi-community-family-tree-design.md` — Sections 4.1, 5.2 (Auth + Users)

**Depends on:** Plan 1 (Foundation) completed.

---

### Task 1: Install Auth Dependencies

**Files:**
- Modify: `apps/api/package.json`

- [ ] **Step 1: Add dependencies**

Add to `apps/api/package.json` dependencies:

```json
{
  "dependencies": {
    "@nestjs/jwt": "^11.0.0",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.0"
  }
}
```

- [ ] **Step 2: Install**

Run: `cd apps/api && pnpm install`

- [ ] **Step 3: Enable global validation pipe in `apps/api/src/main.ts`**

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(3000);
  console.log('API server running on http://localhost:3000');
}
bootstrap();
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/
git commit -m "feat(api): add auth dependencies and global validation pipe"
```

---

### Task 2: JWT Service & Configuration

**Files:**
- Create: `apps/api/src/auth/auth.module.ts`
- Create: `apps/api/src/auth/jwt.strategy.ts`
- Create: `apps/api/src/auth/auth.guard.ts`
- Create: `apps/api/src/auth/public.decorator.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create public route decorator**

Create `apps/api/src/auth/public.decorator.ts`:

```typescript
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

- [ ] **Step 2: Create JWT auth guard**

Create `apps/api/src/auth/auth.guard.ts`:

```typescript
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException('Missing access token');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      request['user'] = { userId: payload.sub, email: payload.email };
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
```

- [ ] **Step 3: Create auth module**

Create `apps/api/src/auth/auth.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  providers: [
    AuthService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
  controllers: [AuthController],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
```

- [ ] **Step 4: Update app module to import AuthModule**

Modify `apps/api/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@family-tree/database';
import { AuthModule } from './auth/auth.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    PrismaModule,
    AuthModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
```

- [ ] **Step 5: Mark health endpoint as public**

Modify `apps/api/src/app.controller.ts`:

```typescript
import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '@family-tree/database';
import { Public } from './auth/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('health')
  async health() {
    const communityCount = await this.prisma.community.count();
    return {
      status: 'ok',
      service: 'family-tree-api',
      database: 'connected',
      communities: communityCount,
    };
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/
git commit -m "feat(api): add JWT auth guard with public route decorator"
```

---

### Task 3: Auth Service — Magic Link & Sessions (TDD)

**Files:**
- Create: `apps/api/src/auth/auth.service.ts`
- Create: `apps/api/src/auth/auth.service.spec.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/api/src/auth/auth.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '@family-tree/database';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;
  let configService: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      magicLink: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      session: {
        create: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('mock-access-token'),
    };
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'MAGIC_LINK_EXPIRY_MINUTES') return '15';
        if (key === 'SESSION_EXPIRY_DAYS') return '180';
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('sendInvite', () => {
    it('creates a new user and magic link for unknown email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'user-1', email: 'test@example.com', displayName: 'test', status: 'invited' });
      prisma.magicLink.create.mockResolvedValue({ id: 'ml-1', token: 'abc123' });

      const result = await service.sendInvite('test@example.com', 'Test User');

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: 'test@example.com', displayName: 'Test User', status: 'invited' }),
        }),
      );
      expect(prisma.magicLink.create).toHaveBeenCalled();
      expect(result).toHaveProperty('magicLinkToken');
    });

    it('creates only a magic link for existing user', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      prisma.magicLink.create.mockResolvedValue({ id: 'ml-1', token: 'abc123' });

      const result = await service.sendInvite('test@example.com', 'Test User');

      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(prisma.magicLink.create).toHaveBeenCalled();
      expect(result).toHaveProperty('magicLinkToken');
    });
  });

  describe('verifyMagicLink', () => {
    it('throws UnauthorizedException for invalid token', async () => {
      prisma.magicLink.findUnique.mockResolvedValue(null);
      await expect(service.verifyMagicLink('bad-token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for expired token', async () => {
      prisma.magicLink.findUnique.mockResolvedValue({
        id: 'ml-1',
        token: 'expired',
        expiresAt: new Date(Date.now() - 1000),
        usedAt: null,
        user: { id: 'user-1', email: 'test@example.com' },
      });
      await expect(service.verifyMagicLink('expired')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for already-used token', async () => {
      prisma.magicLink.findUnique.mockResolvedValue({
        id: 'ml-1',
        token: 'used',
        expiresAt: new Date(Date.now() + 60000),
        usedAt: new Date(),
        user: { id: 'user-1', email: 'test@example.com' },
      });
      await expect(service.verifyMagicLink('used')).rejects.toThrow(UnauthorizedException);
    });

    it('returns tokens for valid magic link', async () => {
      prisma.magicLink.findUnique.mockResolvedValue({
        id: 'ml-1',
        token: 'valid',
        expiresAt: new Date(Date.now() + 60000),
        usedAt: null,
        userId: 'user-1',
        user: { id: 'user-1', email: 'test@example.com', status: 'invited' },
      });
      prisma.magicLink.update.mockResolvedValue({});
      prisma.user.update.mockResolvedValue({});
      prisma.session.create.mockResolvedValue({ refreshToken: 'refresh-123' });

      const result = await service.verifyMagicLink('valid');

      expect(result).toHaveProperty('accessToken', 'mock-access-token');
      expect(result).toHaveProperty('refreshToken', 'refresh-123');
      expect(prisma.magicLink.update).toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: { status: 'active' },
        }),
      );
    });
  });

  describe('refreshAccessToken', () => {
    it('throws UnauthorizedException for invalid refresh token', async () => {
      prisma.session.findUnique.mockResolvedValue(null);
      await expect(service.refreshAccessToken('bad-token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for expired session', async () => {
      prisma.session.findUnique.mockResolvedValue({
        id: 's-1',
        expiresAt: new Date(Date.now() - 1000),
        user: { id: 'user-1', email: 'test@example.com' },
      });
      prisma.session.delete.mockResolvedValue({});
      await expect(service.refreshAccessToken('expired-refresh')).rejects.toThrow(UnauthorizedException);
    });

    it('returns new access token for valid refresh token', async () => {
      prisma.session.findUnique.mockResolvedValue({
        id: 's-1',
        expiresAt: new Date(Date.now() + 86400000),
        user: { id: 'user-1', email: 'test@example.com' },
      });

      const result = await service.refreshAccessToken('valid-refresh');

      expect(result).toHaveProperty('accessToken', 'mock-access-token');
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/api && npx jest src/auth/auth.service.spec.ts`
Expected: FAIL — `AuthService` not found.

- [ ] **Step 3: Implement AuthService**

Create `apps/api/src/auth/auth.service.ts`:

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@family-tree/database';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async sendInvite(
    email: string,
    displayName: string,
  ): Promise<{ magicLinkToken: string; userId: string }> {
    let user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await this.prisma.user.create({
        data: { email, displayName, status: 'invited' },
      });
    }

    const token = randomBytes(32).toString('hex');
    const expiryMinutes = parseInt(
      this.configService.get<string>('MAGIC_LINK_EXPIRY_MINUTES') || '15',
      10,
    );
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    await this.prisma.magicLink.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    // In production, send email with link. For prototype, log it.
    console.log(`[MAGIC LINK] ${email}: /api/auth/verify/${token}`);

    return { magicLinkToken: token, userId: user.id };
  }

  async verifyMagicLink(
    token: string,
    deviceInfo?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const magicLink = await this.prisma.magicLink.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!magicLink) {
      throw new UnauthorizedException('Invalid magic link');
    }

    if (magicLink.usedAt) {
      throw new UnauthorizedException('Magic link already used');
    }

    if (magicLink.expiresAt < new Date()) {
      throw new UnauthorizedException('Magic link expired');
    }

    // Mark magic link as used
    await this.prisma.magicLink.update({
      where: { id: magicLink.id },
      data: { usedAt: new Date() },
    });

    // Activate user if invited
    if (magicLink.user.status === 'invited') {
      await this.prisma.user.update({
        where: { id: magicLink.user.id },
        data: { status: 'active' },
      });
    }

    // Create session with refresh token
    const refreshToken = randomBytes(32).toString('hex');
    const sessionExpiryDays = parseInt(
      this.configService.get<string>('SESSION_EXPIRY_DAYS') || '180',
      10,
    );
    const expiresAt = new Date(
      Date.now() + sessionExpiryDays * 24 * 60 * 60 * 1000,
    );

    await this.prisma.session.create({
      data: {
        userId: magicLink.user.id,
        refreshToken,
        deviceInfo: deviceInfo || null,
        expiresAt,
      },
    });

    // Generate access token
    const accessToken = await this.generateAccessToken(
      magicLink.user.id,
      magicLink.user.email,
    );

    return { accessToken, refreshToken };
  }

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: string }> {
    const session = await this.prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (session.expiresAt < new Date()) {
      await this.prisma.session.delete({ where: { id: session.id } });
      throw new UnauthorizedException('Session expired');
    }

    const accessToken = await this.generateAccessToken(
      session.user.id,
      session.user.email,
    );

    return { accessToken };
  }

  private async generateAccessToken(
    userId: string,
    email: string,
  ): Promise<string> {
    return this.jwtService.signAsync({ sub: userId, email });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/api && npx jest src/auth/auth.service.spec.ts`
Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/auth/
git commit -m "feat(api): implement AuthService with magic link and session management"
```

---

### Task 4: Auth Controller & DTOs

**Files:**
- Create: `apps/api/src/auth/dto/invite.dto.ts`
- Create: `apps/api/src/auth/dto/refresh.dto.ts`
- Create: `apps/api/src/auth/auth.controller.ts`

- [ ] **Step 1: Create invite DTO**

Create `apps/api/src/auth/dto/invite.dto.ts`:

```typescript
import { IsEmail, IsString, MinLength } from 'class-validator';

export class InviteDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  displayName: string;
}
```

- [ ] **Step 2: Create refresh DTO**

Create `apps/api/src/auth/dto/refresh.dto.ts`:

```typescript
import { IsString } from 'class-validator';

export class RefreshDto {
  @IsString()
  refreshToken: string;
}
```

- [ ] **Step 3: Create auth controller**

Create `apps/api/src/auth/auth.controller.ts`:

```typescript
import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { InviteDto } from './dto/invite.dto';
import { RefreshDto } from './dto/refresh.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('invite')
  async invite(@Body() dto: InviteDto) {
    const result = await this.authService.sendInvite(dto.email, dto.displayName);
    // In production, don't return the token — it's sent via email.
    // For the prototype, return it for easy testing.
    return {
      message: 'Invite sent. Check server logs for the magic link.',
      magicLinkToken: result.magicLinkToken,
      userId: result.userId,
    };
  }

  @Public()
  @Get('verify/:token')
  async verify(
    @Param('token') token: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    const result = await this.authService.verifyMagicLink(token, userAgent);
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  }

  @Public()
  @Post('refresh')
  async refresh(@Body() dto: RefreshDto) {
    const result = await this.authService.refreshAccessToken(dto.refreshToken);
    return { accessToken: result.accessToken };
  }
}
```

- [ ] **Step 4: Verify auth endpoints work**

Start server: `cd apps/api && pnpm run start:dev`

Test invite:
```bash
curl -X POST http://localhost:3000/api/auth/invite \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","displayName":"Test User"}'
```
Expected: Returns `{ message: "...", magicLinkToken: "...", userId: "..." }`. Server logs the magic link.

Test verify (use the token from above):
```bash
curl http://localhost:3000/api/auth/verify/<token-from-above>
```
Expected: Returns `{ accessToken: "...", refreshToken: "..." }`

Test refresh (use the refresh token from above):
```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refresh-token-from-above>"}'
```
Expected: Returns `{ accessToken: "..." }`

Test protected route without token:
```bash
curl http://localhost:3000/api/health
```
Expected: Returns health (it's public).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/auth/
git commit -m "feat(api): add auth controller with invite, verify, and refresh endpoints"
```

---

### Task 5: Request User Decorator

**Files:**
- Create: `apps/api/src/auth/user.decorator.ts`

- [ ] **Step 1: Create user decorator for extracting authenticated user from request**

Create `apps/api/src/auth/user.decorator.ts`:

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface RequestUser {
  userId: string;
  email: string;
}

export const CurrentUser = createParamDecorator(
  (data: keyof RequestUser | undefined, ctx: ExecutionContext): RequestUser | string => {
    const request = ctx.switchToHttp().getRequest();
    const user: RequestUser = request.user;
    return data ? user[data] : user;
  },
);
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/auth/user.decorator.ts
git commit -m "feat(api): add CurrentUser param decorator"
```

---

### Task 6: Users Module — Profile Endpoints (TDD)

**Files:**
- Create: `apps/api/src/users/users.module.ts`
- Create: `apps/api/src/users/users.controller.ts`
- Create: `apps/api/src/users/users.service.ts`
- Create: `apps/api/src/users/users.service.spec.ts`
- Create: `apps/api/src/users/dto/update-user.dto.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Write failing tests for UsersService**

Create `apps/api/src/users/users.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '@family-tree/database';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      person: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('getProfile', () => {
    it('returns user with linked person data', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        displayName: 'Test User',
        profilePhoto: null,
        status: 'active',
        person: {
          id: 'person-1',
          profileId: 'test.user',
          name: 'Test User',
          birthYear: 1990,
          gender: 'M',
          isDeceased: false,
        },
      });

      const result = await service.getProfile('user-1');

      expect(result.email).toBe('test@example.com');
      expect(result.person?.profileId).toBe('test.user');
    });

    it('throws NotFoundException for unknown user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getProfile('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('updates user displayName and profilePhoto', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', person: null });
      prisma.user.update.mockResolvedValue({
        id: 'user-1',
        displayName: 'New Name',
        profilePhoto: '/uploads/photo.jpg',
      });

      const result = await service.updateProfile('user-1', {
        displayName: 'New Name',
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { displayName: 'New Name' },
        include: { person: true },
      });
    });

    it('also updates linked person name when displayName changes', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        person: { id: 'person-1' },
      });
      prisma.user.update.mockResolvedValue({ id: 'user-1', displayName: 'New Name', person: { id: 'person-1', name: 'New Name' } });
      prisma.person.update.mockResolvedValue({});

      await service.updateProfile('user-1', { displayName: 'New Name' });

      expect(prisma.person.update).toHaveBeenCalledWith({
        where: { id: 'person-1' },
        data: { name: 'New Name' },
      });
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/api && npx jest src/users/users.service.spec.ts`
Expected: FAIL — `UsersService` not found.

- [ ] **Step 3: Create update DTO**

Create `apps/api/src/users/dto/update-user.dto.ts`:

```typescript
import { IsString, MinLength, IsOptional } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  displayName?: string;

  @IsOptional()
  @IsString()
  profilePhoto?: string;
}
```

- [ ] **Step 4: Implement UsersService**

Create `apps/api/src/users/users.service.ts`:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@family-tree/database';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { person: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      profilePhoto: user.profilePhoto,
      status: user.status,
      person: user.person
        ? {
            id: user.person.id,
            profileId: user.person.profileId,
            name: user.person.name,
            birthYear: user.person.birthYear,
            deathYear: user.person.deathYear,
            isDeceased: user.person.isDeceased,
            gender: user.person.gender,
          }
        : null,
    };
  }

  async updateProfile(userId: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { person: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updateData: Record<string, any> = {};
    if (dto.displayName !== undefined) updateData.displayName = dto.displayName;
    if (dto.profilePhoto !== undefined) updateData.profilePhoto = dto.profilePhoto;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: { person: true },
    });

    // Sync name to linked Person if displayName changed
    if (dto.displayName && user.person) {
      await this.prisma.person.update({
        where: { id: user.person.id },
        data: { name: dto.displayName },
      });
    }

    return updated;
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd apps/api && npx jest src/users/users.service.spec.ts`
Expected: All 4 tests PASS.

- [ ] **Step 6: Create users controller**

Create `apps/api/src/users/users.controller.ts`:

```typescript
import { Controller, Get, Put, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { CurrentUser, RequestUser } from '../auth/user.decorator';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getProfile(@CurrentUser() user: RequestUser) {
    return this.usersService.getProfile(user.userId);
  }

  @Put('me')
  async updateProfile(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateProfile(user.userId, dto);
  }
}
```

- [ ] **Step 7: Create users module**

Create `apps/api/src/users/users.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

- [ ] **Step 8: Register UsersModule in AppModule**

Update `apps/api/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@family-tree/database';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
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
  ],
  controllers: [AppController],
})
export class AppModule {}
```

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/
git commit -m "feat(api): add users module with profile get/update endpoints"
```

---

### Task 7: Integration Verification

**Files:** None (verification only)

- [ ] **Step 1: Run all tests**

Run: `cd apps/api && npx jest`
Expected: All tests pass (auth service + users service).

- [ ] **Step 2: Full auth flow verification**

Start server: `cd apps/api && pnpm run start:dev`

```bash
# 1. Send invite
curl -s -X POST http://localhost:3000/api/auth/invite \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","displayName":"Test User"}'
# Save the magicLinkToken from response

# 2. Verify magic link (use token from step 1)
curl -s http://localhost:3000/api/auth/verify/<MAGIC_LINK_TOKEN>
# Save accessToken and refreshToken from response

# 3. Access protected endpoint
curl -s http://localhost:3000/api/users/me \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
# Expected: user profile returned

# 4. Access protected endpoint without token
curl -s http://localhost:3000/api/users/me
# Expected: 401 Unauthorized

# 5. Refresh access token
curl -s -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<REFRESH_TOKEN>"}'
# Expected: new accessToken returned

# 6. Update profile
curl -s -X PUT http://localhost:3000/api/users/me \
  -H "Authorization: Bearer <NEW_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"displayName":"Updated Name"}'
# Expected: updated user returned
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(api): complete auth and users module"
```

---

## File Summary

| Path | Purpose |
|------|---------|
| `apps/api/src/auth/auth.module.ts` | Auth module — JWT config, global guard registration |
| `apps/api/src/auth/auth.service.ts` | Magic link generation, verification, session/token management |
| `apps/api/src/auth/auth.service.spec.ts` | Auth service unit tests |
| `apps/api/src/auth/auth.controller.ts` | POST /auth/invite, GET /auth/verify/:token, POST /auth/refresh |
| `apps/api/src/auth/auth.guard.ts` | JWT auth guard (global, skips @Public routes) |
| `apps/api/src/auth/public.decorator.ts` | @Public() decorator to skip auth |
| `apps/api/src/auth/user.decorator.ts` | @CurrentUser() param decorator |
| `apps/api/src/auth/dto/invite.dto.ts` | Invite request validation |
| `apps/api/src/auth/dto/refresh.dto.ts` | Refresh request validation |
| `apps/api/src/users/users.module.ts` | Users module |
| `apps/api/src/users/users.service.ts` | Profile get/update logic with Person sync |
| `apps/api/src/users/users.service.spec.ts` | Users service unit tests |
| `apps/api/src/users/users.controller.ts` | GET /users/me, PUT /users/me |
| `apps/api/src/users/dto/update-user.dto.ts` | Update profile validation |
