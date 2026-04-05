# Admin Server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the back-office admin NestJS application (port 3001) with password + TOTP 2FA auth, full community/user/person/link management, tree operations (shared logic, no membership check), and audit dashboard.

**Architecture:** `apps/admin/` is a standalone NestJS app sharing `@family-tree/database` with the API server. Tree operations reuse shared service logic from `packages/database` (or imported from a shared library). Auth is completely separate — AdminUser model, AdminSession, password + TOTP.

**Tech Stack:** NestJS 11, Prisma 6, class-validator, bcrypt (password hashing), otplib (TOTP generation/verification)

**Spec:** `docs/superpowers/specs/2026-04-04-multi-community-family-tree-design.md` — Sections 3.2, 4.2, 5.3, 5.4

**Depends on:** Plan 1 (Foundation) completed. Can be developed in parallel with Plans 2-4 since admin auth is independent.

---

### Task 1: Admin Auth — Password + JWT (TDD)

**Files:**
- Create: `apps/admin/src/admin-auth/admin-auth.service.ts`
- Create: `apps/admin/src/admin-auth/admin-auth.service.spec.ts`
- Create: `apps/admin/src/admin-auth/admin-auth.module.ts`
- Create: `apps/admin/src/admin-auth/dto/login.dto.ts`
- Create: `apps/admin/src/admin-auth/dto/refresh.dto.ts`
- Create: `apps/admin/src/admin-auth/guards/admin-auth.guard.ts`
- Create: `apps/admin/src/admin-auth/decorators/current-admin.decorator.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// apps/admin/src/admin-auth/admin-auth.service.spec.ts
import { Test } from '@nestjs/testing';
import { AdminAuthService } from './admin-auth.service';
import { PrismaService } from '@family-tree/database';
import { JwtService } from '@nestjs/jwt';

describe('AdminAuthService', () => {
  let service: AdminAuthService;

  describe('login', () => {
    it('returns tokens when email and password are valid (no 2FA)', async () => {
      // Mock: AdminUser with valid passwordHash, otpEnabled=false
      // Expect: { accessToken, refreshToken }
    });

    it('returns requiresOtp flag when 2FA is enabled and no OTP provided', async () => {
      // Mock: AdminUser with otpEnabled=true
      // Input: email + password, no otpCode
      // Expect: { requiresOtp: true, tempToken: '...' }
    });

    it('returns tokens when email, password, and valid OTP provided', async () => {
      // Mock: AdminUser with otpEnabled=true, valid otpSecret
      // Input: email + password + otpCode
      // Expect: { accessToken, refreshToken }
    });

    it('rejects invalid password', async () => {
      // Expect: UnauthorizedException
    });

    it('rejects invalid OTP code', async () => {
      // Expect: UnauthorizedException
    });

    it('rejects non-existent email', async () => {
      // Expect: UnauthorizedException (generic, no user enumeration)
    });
  });

  describe('refresh', () => {
    it('returns new access token for valid refresh token', async () => {
      // Mock: AdminSession with valid, non-expired refreshToken
      // Expect: new accessToken
    });

    it('rejects expired refresh token', async () => {
      // Expect: UnauthorizedException
    });
  });

  describe('createAdminUser', () => {
    it('hashes password and creates AdminUser', async () => {
      // Expect: bcrypt.hash called, AdminUser created with hashed password
    });

    it('rejects duplicate email', async () => {
      // Expect: ConflictException
    });
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `cd apps/admin && npx jest src/admin-auth/admin-auth.service.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Implement AdminAuthService**

```typescript
// apps/admin/src/admin-auth/admin-auth.service.ts
import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@family-tree/database';
import * as bcrypt from 'bcrypt';
import { authenticator } from 'otplib';

@Injectable()
export class AdminAuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async login(email: string, password: string, otpCode?: string) {
    // 1. Find AdminUser by email
    // 2. Verify password with bcrypt.compare
    // 3. If otpEnabled and no otpCode → return { requiresOtp: true }
    // 4. If otpEnabled and otpCode → verify with authenticator.verify
    // 5. Create AdminSession with refreshToken
    // 6. Return { accessToken (JWT), refreshToken }
  }

  async refresh(refreshToken: string) {
    // 1. Find AdminSession by refreshToken
    // 2. Check not expired
    // 3. Return new accessToken (JWT)
  }

  async createAdminUser(email: string, name: string, password: string) {
    // 1. Check email uniqueness
    // 2. Hash password with bcrypt (salt rounds: 12)
    // 3. Create AdminUser
  }
}
```

- [ ] **Step 4: Run tests to verify passing**

Expected: PASS.

- [ ] **Step 5: Create DTOs, Guard, and Decorator**

```typescript
// dto/login.dto.ts
export class LoginDto {
  @IsEmail() email: string;
  @IsString() password: string;
  @IsOptional() @IsString() otpCode?: string;
}

// dto/refresh.dto.ts
export class RefreshDto {
  @IsString() refreshToken: string;
}

// guards/admin-auth.guard.ts — same pattern as API AuthGuard but uses AdminUser JWT
// decorators/current-admin.decorator.ts — extracts AdminUser from request
```

---

### Task 2: TOTP 2FA Setup & Management (TDD)

**Files:**
- Modify: `apps/admin/src/admin-auth/admin-auth.service.ts`
- Modify: `apps/admin/src/admin-auth/admin-auth.service.spec.ts`

- [ ] **Step 1: Write failing tests**

Add to `admin-auth.service.spec.ts`:

```typescript
describe('2FA management', () => {
  describe('setup2FA', () => {
    it('generates OTP secret and returns otpauth URI for QR code', async () => {
      // Expect: { secret, otpauthUrl } — secret is NOT saved yet
    });

    it('rejects if 2FA already enabled', async () => {
      // Expect: BadRequestException
    });
  });

  describe('verify2FA', () => {
    it('verifies OTP code against secret and enables 2FA', async () => {
      // Input: adminUserId + otpCode + secret (from setup step)
      // Expect: otpSecret saved, otpEnabled = true
    });

    it('rejects invalid OTP code during verification', async () => {
      // Expect: BadRequestException
    });
  });

  describe('disable2FA', () => {
    it('clears otpSecret and sets otpEnabled to false', async () => {
      // Expect: otpSecret = null, otpEnabled = false
    });

    it('rejects if 2FA not enabled', async () => {
      // Expect: BadRequestException
    });
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

- [ ] **Step 3: Implement 2FA methods**

```typescript
// Add to AdminAuthService:

async setup2FA(adminUserId: string) {
  // 1. Verify 2FA not already enabled
  // 2. Generate secret with authenticator.generateSecret()
  // 3. Generate otpauth URL with authenticator.keyuri(email, 'FamilyTree Admin', secret)
  // 4. Return { secret, otpauthUrl } — client shows QR code
  // Note: secret is NOT saved until verify2FA confirms it works
}

async verify2FA(adminUserId: string, otpCode: string, secret: string) {
  // 1. Verify OTP code against provided secret
  // 2. If valid → save otpSecret, set otpEnabled = true
  // 3. If invalid → BadRequestException
}

async disable2FA(adminUserId: string) {
  // 1. Verify 2FA is enabled
  // 2. Set otpSecret = null, otpEnabled = false
}
```

- [ ] **Step 4: Run tests — expect pass**

---

### Task 3: Admin Auth Controller

**Files:**
- Create: `apps/admin/src/admin-auth/admin-auth.controller.ts`

- [ ] **Step 1: Implement controller**

```typescript
// apps/admin/src/admin-auth/admin-auth.controller.ts
import { Controller, Post, Get, Put, Delete, Body, UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { CurrentAdmin } from './decorators/current-admin.decorator';
import { AdminAuthService } from './admin-auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';

@Controller('admin/auth')
export class AdminAuthController {
  constructor(private adminAuthService: AdminAuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.adminAuthService.login(dto.email, dto.password, dto.otpCode);
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshDto) {
    return this.adminAuthService.refresh(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(AdminAuthGuard)
  async getProfile(@CurrentAdmin() admin) {
    return { id: admin.id, email: admin.email, name: admin.name, otpEnabled: admin.otpEnabled };
  }

  @Put('me')
  @UseGuards(AdminAuthGuard)
  async updateProfile(@CurrentAdmin() admin, @Body() dto: UpdateAdminProfileDto) {
    return this.adminAuthService.updateProfile(admin.id, dto);
  }

  @Post('2fa/setup')
  @UseGuards(AdminAuthGuard)
  async setup2FA(@CurrentAdmin() admin) {
    return this.adminAuthService.setup2FA(admin.id);
  }

  @Post('2fa/verify')
  @UseGuards(AdminAuthGuard)
  async verify2FA(@CurrentAdmin() admin, @Body() dto: Verify2FADto) {
    return this.adminAuthService.verify2FA(admin.id, dto.otpCode, dto.secret);
  }

  @Delete('2fa')
  @UseGuards(AdminAuthGuard)
  async disable2FA(@CurrentAdmin() admin) {
    return this.adminAuthService.disable2FA(admin.id);
  }
}
```

---

### Task 4: Admin Management (Back-Office Admins CRUD)

**Files:**
- Create: `apps/admin/src/admin-management/admin-management.service.ts`
- Create: `apps/admin/src/admin-management/admin-management.controller.ts`
- Create: `apps/admin/src/admin-management/admin-management.module.ts`
- Create: `apps/admin/src/admin-management/dto/create-admin.dto.ts`
- Create: `apps/admin/src/admin-management/dto/update-admin.dto.ts`

- [ ] **Step 1: Implement AdminManagementService**

```typescript
// CRUD for AdminUser records
// - list(): all admins
// - create(): hash password, create AdminUser
// - update(): update name, email, optionally password
// - remove(): delete AdminUser + their AdminSessions
// Note: "super admin" concept is deferred — all back-office admins are equal for prototype
```

- [ ] **Step 2: Implement controller**

```typescript
@Controller('admin/admins')
@UseGuards(AdminAuthGuard)
export class AdminManagementController {
  @Get()    list()
  @Post()   create(@Body() dto: CreateAdminDto)
  @Put(':id')  update(@Param('id') id, @Body() dto: UpdateAdminDto)
  @Delete(':id') remove(@Param('id') id)
}
```

---

### Task 5: Admin Community Management

**Files:**
- Create: `apps/admin/src/admin-communities/admin-communities.service.ts`
- Create: `apps/admin/src/admin-communities/admin-communities.controller.ts`
- Create: `apps/admin/src/admin-communities/admin-communities.module.ts`
- Create: `apps/admin/src/admin-communities/dto/` (create, update, assign-admin DTOs)

- [ ] **Step 1: Implement AdminCommunitiesService**

```typescript
// Full community management — no membership restrictions
// - list(): all communities with member counts
// - getById(): community details + tree summary + admins
// - create(): same wizard logic as API server (Path B — no "me" node)
// - update(): name, settings
// - remove(): delete community + all TreeNodes + Couples + CoupleChild (cascade)
// - assignAdmins(): set/remove community admin roles
```

Key difference from API server: no community membership check. Back-office admin can manage any community.

- [ ] **Step 2: Implement controller**

```typescript
@Controller('admin/communities')
@UseGuards(AdminAuthGuard)
export class AdminCommunitiesController {
  @Get()           list()
  @Get(':id')      getById(@Param('id') id)
  @Post()          create(@Body() dto)
  @Put(':id')      update(@Param('id') id, @Body() dto)
  @Delete(':id')   remove(@Param('id') id)
  @Put(':id/admins') assignAdmins(@Param('id') id, @Body() dto)
}
```

---

### Task 6: Admin Tree Operations

**Files:**
- Create: `apps/admin/src/admin-tree/admin-tree.controller.ts`
- Create: `apps/admin/src/admin-tree/admin-tree.module.ts`

- [ ] **Step 1: Implement admin tree controller**

The admin tree controller wraps the **same shared tree service logic** from Plan 3, but:
- Uses `AdminAuthGuard` instead of `AuthGuard`
- No community membership check (admin can edit any community)
- Actions logged with `actorType: "admin"` (future audit trail)

```typescript
@Controller('admin/communities/:communityId/tree')
@UseGuards(AdminAuthGuard)
export class AdminTreeController {
  constructor(private treeService: TreeService) {} // shared service

  @Get()                    getTree(@Param('communityId') id)
  @Post('add-spouse')       addSpouse(@Param('communityId') id, @Body() dto)
  @Post('add-child')        addChild(@Param('communityId') id, @Body() dto)
  @Post('add-parents')      addParents(@Param('communityId') id, @Body() dto)
  @Post('add-sibling')      addSibling(@Param('communityId') id, @Body() dto)
  @Put('nodes/:nodeId')     editNode(@Param('communityId') cId, @Param('nodeId') nId, @Body() dto)
  @Delete('nodes/:nodeId')  removeNode(@Param('communityId') cId, @Param('nodeId') nId)
}
```

**Note:** `TreeService` is imported from a shared module (either `packages/database` or a shared NestJS module). The key is that the business logic is written once and used by both API and admin servers.

---

### Task 7: Admin User & Person Management

**Files:**
- Create: `apps/admin/src/admin-users/admin-users.service.ts`
- Create: `apps/admin/src/admin-users/admin-users.controller.ts`
- Create: `apps/admin/src/admin-users/admin-users.module.ts`
- Create: `apps/admin/src/admin-persons/admin-persons.service.ts`
- Create: `apps/admin/src/admin-persons/admin-persons.controller.ts`
- Create: `apps/admin/src/admin-persons/admin-persons.module.ts`

- [ ] **Step 1: Implement AdminUsersService**

```typescript
// Platform user management
// - list(filters): all users with pagination, filter by status/name/email
// - getById(): user details + their Person + communities (via TreeNodes)
// - invite(): create User (invited) + send magic link
// - update(): email, displayName, status
// - remove(): delete User (Person preserved if has TreeNodes)
```

- [ ] **Step 2: Implement AdminPersonsService**

```typescript
// Person data management — per permissions matrix:
// Back-office admin can edit ANY Person's data including:
// - name, birthYear, gender, profileId
// - isDeceased, deathYear (admin-only fields)
//
// - list(filters): all persons with pagination
// - getById(): person details + all TreeNodes (across communities)
// - update(): any field on Person
```

- [ ] **Step 3: Implement controllers**

```typescript
@Controller('admin/users')
@UseGuards(AdminAuthGuard)
export class AdminUsersController {
  @Get()           list(@Query() filters)
  @Get(':id')      getById(@Param('id') id)
  @Post('invite')  invite(@Body() dto)
  @Put(':id')      update(@Param('id') id, @Body() dto)
  @Delete(':id')   remove(@Param('id') id)
}

@Controller('admin/persons')
@UseGuards(AdminAuthGuard)
export class AdminPersonsController {
  @Get()           list(@Query() filters)
  @Get(':id')      getById(@Param('id') id)
  @Put(':id')      update(@Param('id') id, @Body() dto)
}
```

---

### Task 8: Admin Cross-Community Links Management

**Files:**
- Create: `apps/admin/src/admin-links/admin-links.service.ts`
- Create: `apps/admin/src/admin-links/admin-links.controller.ts`
- Create: `apps/admin/src/admin-links/admin-links.module.ts`

- [ ] **Step 1: Implement AdminLinksService**

```typescript
// Back-office admin has elevated link permissions:
// - list(): all links (pending, approved, rejected) with filters
// - createApproved(): create link with status "approved" directly (bypass request flow)
// - overrideStatus(): change any link's status (approve rejected, reject approved, etc.)
// - remove(): delete a link entirely
// All actions logged via CrossCommunityLinkAction with actorType: "admin"
```

- [ ] **Step 2: Implement controller**

```typescript
@Controller('admin/links')
@UseGuards(AdminAuthGuard)
export class AdminLinksController {
  @Get()           list(@Query() filters)
  @Post()          createApproved(@Body() dto)
  @Put(':id')      overrideStatus(@Param('id') id, @Body() dto)
  @Delete(':id')   remove(@Param('id') id)
}
```

---

### Task 9: Audit & Dashboard

**Files:**
- Create: `apps/admin/src/admin-audit/admin-audit.service.ts`
- Create: `apps/admin/src/admin-audit/admin-audit.controller.ts`
- Create: `apps/admin/src/admin-audit/admin-audit.module.ts`

- [ ] **Step 1: Implement dashboard endpoint**

```typescript
// GET /admin/dashboard
// Returns: { communityCount, userCount, personCount, pendingLinksCount, recentActivity }
async getDashboard() {
  const [communityCount, userCount, personCount, pendingLinksCount] = await Promise.all([
    this.prisma.community.count(),
    this.prisma.user.count(),
    this.prisma.person.count(),
    this.prisma.crossCommunityLink.count({ where: { status: 'pending' } }),
  ]);
  return { communityCount, userCount, personCount, pendingLinksCount };
}
```

- [ ] **Step 2: Implement audit log endpoint**

```typescript
// GET /admin/audit?actorType=admin&action=approved&from=2026-01-01&to=2026-04-01&page=1
// Returns: paginated CrossCommunityLinkAction records with filters
// Note: For prototype, only link actions are audited. Future: extend to all mutations.
async getAuditLog(filters: AuditFiltersDto) {
  return this.prisma.crossCommunityLinkAction.findMany({
    where: {
      ...(filters.actorType && { actorType: filters.actorType }),
      ...(filters.action && { action: filters.action }),
      ...(filters.from && { createdAt: { gte: new Date(filters.from) } }),
      ...(filters.to && { createdAt: { lte: new Date(filters.to) } }),
    },
    include: { link: { include: { treeNodeA: true, treeNodeB: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
    skip: ((filters.page || 1) - 1) * 50,
  });
}
```

- [ ] **Step 3: Implement controller**

```typescript
@Controller('admin')
@UseGuards(AdminAuthGuard)
export class AdminAuditController {
  @Get('dashboard') getDashboard()
  @Get('audit')     getAuditLog(@Query() filters: AuditFiltersDto)
}
```

---

### Task 10: Admin AppModule & Registration

**Files:**
- Modify: `apps/admin/src/app.module.ts`

- [ ] **Step 1: Register all admin modules**

```typescript
// apps/admin/src/app.module.ts
@Module({
  imports: [
    PrismaModule,           // shared from @family-tree/database
    JwtModule.register({ secret: process.env.ADMIN_JWT_SECRET, signOptions: { expiresIn: '15m' } }),
    AdminAuthModule,
    AdminManagementModule,
    AdminCommunitiesModule,
    AdminTreeModule,
    AdminUsersModule,
    AdminPersonsModule,
    AdminLinksModule,
    AdminAuditModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 2: Verify admin server starts**

Run: `cd apps/admin && pnpm run start:dev`
Expected: Server starts on port 3001 with all routes registered.

---

### Summary

| Task | What | TDD | Files |
|------|------|-----|-------|
| 1 | Admin auth (password + JWT) | Yes (8 tests) | 7 new |
| 2 | TOTP 2FA setup/verify/disable | Yes (5 tests) | 2 modified |
| 3 | Admin auth controller | No | 1 new |
| 4 | Admin management (admins CRUD) | No | 5 new |
| 5 | Admin community management | No | 4+ new |
| 6 | Admin tree operations (shared logic) | No | 2 new |
| 7 | Admin user & person management | No | 6 new |
| 8 | Admin cross-community links | No | 3 new |
| 9 | Audit & dashboard | No | 3 new |
| 10 | AppModule registration | No | 1 modified |

**Total: ~13 tests (auth-focused), ~30+ files**

**Key design principle:** Business logic is shared between API and admin servers. Admin server differs only in auth (AdminAuthGuard), scope (no membership checks), and audit logging (actorType: "admin").
