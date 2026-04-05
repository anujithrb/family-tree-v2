# Communities & Tree Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement community CRUD with the atomic wizard creation, all tree mutation operations (add-spouse, add-child, add-parents, add-sibling, edit, delete), tree fetch with bloodline computation, and the 4-phase layout algorithm.

**Architecture:** Shared tree-operation functions in `packages/database` (pure logic, no NestJS). API controllers wrap these with auth guards and community membership validation. Bloodline/married-in computed at query time, never stored.

**Tech Stack:** NestJS 11, Prisma 6, class-validator

**Spec:** `docs/superpowers/specs/2026-04-04-multi-community-family-tree-design.md` — Sections 3.4, 3.6, 5.2 (Tree ops), 6, 9, 10

**Depends on:** Plan 1 (Foundation) + Plan 2 (Auth & Users) completed.

---

### Task 1: Shared Bloodline Computation Utility

**Files:**
- Create: `packages/database/src/bloodline.ts`
- Create: `packages/database/src/bloodline.test.ts`
- Modify: `packages/database/src/index.ts`

- [ ] **Step 1: Write failing test**

Create `packages/database/src/bloodline.test.ts`:

```typescript
import { computeBloodlineStatus } from './bloodline';

describe('computeBloodlineStatus', () => {
  it('returns spouse1 as bloodline when spouse1 has parents', () => {
    const result = computeBloodlineStatus({
      spouse1Id: 'node-a',
      spouse2Id: 'node-b',
      spouse1HasParents: true,
      spouse2HasParents: false,
    });
    expect(result).toEqual({ spouseAId: 'node-a', spouseBId: 'node-b' });
  });

  it('returns spouse2 as bloodline when spouse2 has parents', () => {
    const result = computeBloodlineStatus({
      spouse1Id: 'node-a',
      spouse2Id: 'node-b',
      spouse1HasParents: false,
      spouse2HasParents: true,
    });
    expect(result).toEqual({ spouseAId: 'node-b', spouseBId: 'node-a' });
  });

  it('returns storage order when neither has parents (root couple)', () => {
    const result = computeBloodlineStatus({
      spouse1Id: 'node-a',
      spouse2Id: 'node-b',
      spouse1HasParents: false,
      spouse2HasParents: false,
    });
    expect(result).toEqual({ spouseAId: 'node-a', spouseBId: 'node-b' });
  });

  it('returns storage order when both have parents', () => {
    const result = computeBloodlineStatus({
      spouse1Id: 'node-a',
      spouse2Id: 'node-b',
      spouse1HasParents: true,
      spouse2HasParents: true,
    });
    expect(result).toEqual({ spouseAId: 'node-a', spouseBId: 'node-b' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/database && npx jest src/bloodline.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `packages/database/src/bloodline.ts`:

```typescript
export interface BloodlineInput {
  spouse1Id: string;
  spouse2Id: string;
  spouse1HasParents: boolean;
  spouse2HasParents: boolean;
}

export interface BloodlineResult {
  spouseAId: string; // bloodline (renders on left, connector target)
  spouseBId: string; // married-in (renders on right)
}

/**
 * Compute which spouse is bloodline (spouseA) and which is married-in (spouseB).
 * Bloodline = has a CoupleChild row in this community (was born into tree).
 * If neither or both have parents, fall back to storage order (spouse1 = A).
 */
export function computeBloodlineStatus(input: BloodlineInput): BloodlineResult {
  if (input.spouse1HasParents && !input.spouse2HasParents) {
    return { spouseAId: input.spouse1Id, spouseBId: input.spouse2Id };
  }
  if (input.spouse2HasParents && !input.spouse1HasParents) {
    return { spouseAId: input.spouse2Id, spouseBId: input.spouse1Id };
  }
  // Root couple or both bloodline — use storage order
  return { spouseAId: input.spouse1Id, spouseBId: input.spouse2Id };
}
```

- [ ] **Step 4: Run tests**

Run: `cd packages/database && npx jest src/bloodline.test.ts`
Expected: All 4 tests PASS.

- [ ] **Step 5: Export from index**

Add to `packages/database/src/index.ts`:

```typescript
export { computeBloodlineStatus } from './bloodline';
export type { BloodlineInput, BloodlineResult } from './bloodline';
```

- [ ] **Step 6: Commit**

```bash
git add packages/database/src/
git commit -m "feat(db): add bloodline computation utility with tests"
```

---

### Task 2: Community Membership Guard

**Files:**
- Create: `apps/api/src/communities/community-member.guard.ts`

- [ ] **Step 1: Create guard**

Create `apps/api/src/communities/community-member.guard.ts`:

```typescript
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@family-tree/database';

@Injectable()
export class CommunityMemberGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const communityId = request.params.id;
    const userId = request.user?.userId;

    if (!communityId || !userId) {
      throw new ForbiddenException('Missing community or user context');
    }

    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
    });
    if (!community) {
      throw new NotFoundException('Community not found');
    }

    // Check if user has a Person with a TreeNode in this community
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { person: { include: { treeNodes: { where: { communityId } } } } },
    });

    if (!user?.person?.treeNodes?.length) {
      throw new ForbiddenException('You are not a member of this community');
    }

    // Attach communityId and user's treeNodeId to request for downstream use
    request.communityId = communityId;
    request.userTreeNodeId = user.person.treeNodes[0].id;

    return true;
  }
}
```

- [ ] **Step 2: Create community admin guard**

Create `apps/api/src/communities/community-admin.guard.ts`:

```typescript
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '@family-tree/database';

@Injectable()
export class CommunityAdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const communityId = request.params.id;
    const userId = request.user?.userId;

    if (!communityId || !userId) {
      throw new ForbiddenException('Missing community or user context');
    }

    const admin = await this.prisma.communityAdmin.findUnique({
      where: { communityId_userId: { communityId, userId } },
    });

    if (!admin) {
      throw new ForbiddenException('You are not an admin of this community');
    }

    request.communityId = communityId;
    request.adminRole = admin.role;

    return true;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/communities/
git commit -m "feat(api): add community membership and admin guards"
```

---

### Task 3: Community Creation Wizard (TDD)

**Files:**
- Create: `apps/api/src/communities/dto/create-community.dto.ts`
- Create: `apps/api/src/communities/communities.service.ts`
- Create: `apps/api/src/communities/communities.service.spec.ts`

- [ ] **Step 1: Create DTO**

Create `apps/api/src/communities/dto/create-community.dto.ts`:

```typescript
import {
  IsString,
  MinLength,
  IsArray,
  ValidateNested,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class WizardNodeDto {
  @IsString()
  tempId: string;

  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(2100)
  birthYear?: number;

  @IsOptional()
  @IsBoolean()
  isDeceased?: boolean;

  @IsOptional()
  @IsBoolean()
  isSelf?: boolean;
}

export class WizardCoupleDto {
  @IsString()
  spouse1: string; // tempId

  @IsString()
  spouse2: string; // tempId
}

export class WizardChildDto {
  @IsString()
  coupleSpouse1: string; // tempId to identify couple

  @IsString()
  coupleSpouse2: string; // tempId to identify couple

  @IsString()
  childRef: string; // tempId

  @IsInt()
  @Min(0)
  sortOrder: number;
}

export class CreateCommunityDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WizardNodeDto)
  nodes: WizardNodeDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WizardCoupleDto)
  couples: WizardCoupleDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WizardChildDto)
  children: WizardChildDto[];
}
```

- [ ] **Step 2: Write failing test for community creation**

Create `apps/api/src/communities/communities.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { CommunitiesService } from './communities.service';
import { PrismaService } from '@family-tree/database';
import { BadRequestException } from '@nestjs/common';

describe('CommunitiesService', () => {
  let service: CommunitiesService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn((fn) => fn(prisma)),
      community: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
      person: { create: jest.fn(), count: jest.fn().mockResolvedValue(0) },
      treeNode: { create: jest.fn() },
      couple: { create: jest.fn() },
      coupleChild: { create: jest.fn() },
      communityAdmin: { create: jest.fn() },
      user: { findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunitiesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CommunitiesService>(CommunitiesService);
  });

  describe('createCommunity', () => {
    it('rejects when no isSelf node is provided by community admin', async () => {
      const dto = {
        name: 'Test Family',
        nodes: [
          { tempId: 't1', name: 'Parent A' },
          { tempId: 't2', name: 'Parent B' },
        ],
        couples: [{ spouse1: 't1', spouse2: 't2' }],
        children: [],
      };

      await expect(
        service.createCommunity(dto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when couples reference unknown tempIds', async () => {
      const dto = {
        name: 'Test Family',
        nodes: [
          { tempId: 't1', name: 'Me', isSelf: true },
          { tempId: 't2', name: 'Spouse' },
        ],
        couples: [{ spouse1: 't1', spouse2: 't999' }],
        children: [],
      };

      await expect(
        service.createCommunity(dto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates community with all entities in a transaction', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        person: { id: 'person-self' },
      });
      prisma.community.create.mockResolvedValue({ id: 'comm-1' });
      prisma.person.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: `person-${data.profileId}`, ...data }),
      );
      prisma.treeNode.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: `node-${data.personId}`, ...data }),
      );
      prisma.couple.create.mockResolvedValue({ id: 'couple-1' });
      prisma.coupleChild.create.mockResolvedValue({});
      prisma.communityAdmin.create.mockResolvedValue({});

      const dto = {
        name: 'Test Family',
        nodes: [
          { tempId: 't1', name: 'Me', gender: 'M', birthYear: 1990, isSelf: true },
          { tempId: 't2', name: 'Spouse', gender: 'F' },
        ],
        couples: [{ spouse1: 't1', spouse2: 't2' }],
        children: [],
      };

      const result = await service.createCommunity(dto, 'user-1');

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.community.create).toHaveBeenCalled();
      expect(prisma.communityAdmin.create).toHaveBeenCalled();
    });
  });

  describe('listCommunities', () => {
    it('returns communities the user belongs to', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        person: {
          treeNodes: [
            { community: { id: 'comm-1', name: 'Family A', createdAt: new Date() } },
          ],
        },
      });

      const result = await service.listCommunities('user-1');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Family A');
    });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd apps/api && npx jest src/communities/communities.service.spec.ts`
Expected: FAIL.

- [ ] **Step 4: Implement CommunitiesService**

Create `apps/api/src/communities/communities.service.ts`:

```typescript
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService, generateProfileId } from '@family-tree/database';
import { CreateCommunityDto } from './dto/create-community.dto';

@Injectable()
export class CommunitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async createCommunity(dto: CreateCommunityDto, userId: string) {
    // Validate: at least one isSelf node
    const selfNode = dto.nodes.find((n) => n.isSelf);
    if (!selfNode) {
      throw new BadRequestException(
        'You must identify yourself in the tree (isSelf: true)',
      );
    }

    // Validate: all couple tempIds reference existing nodes
    const tempIds = new Set(dto.nodes.map((n) => n.tempId));
    for (const couple of dto.couples) {
      if (!tempIds.has(couple.spouse1) || !tempIds.has(couple.spouse2)) {
        throw new BadRequestException(
          `Couple references unknown tempId: ${couple.spouse1} or ${couple.spouse2}`,
        );
      }
    }
    for (const child of dto.children) {
      if (
        !tempIds.has(child.coupleSpouse1) ||
        !tempIds.has(child.coupleSpouse2) ||
        !tempIds.has(child.childRef)
      ) {
        throw new BadRequestException(
          `Child entry references unknown tempId`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Create community
      const community = await tx.community.create({
        data: { name: dto.name },
      });

      // 2. Get the creating user's Person (or create one)
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { person: true },
      });

      // 3. Create all Persons + TreeNodes
      const tempToNodeId: Record<string, string> = {};
      const tempToPersonId: Record<string, string> = {};

      for (const node of dto.nodes) {
        let personId: string;

        if (node.isSelf && user?.person) {
          // Use existing Person for the self node
          personId = user.person.id;
        } else {
          const checkExists = async (pid: string) => {
            const count = await tx.person.count({
              where: { profileId: pid },
            });
            return count > 0;
          };
          const profileId = await generateProfileId(node.name, checkExists);

          const person = await tx.person.create({
            data: {
              profileId,
              name: node.name,
              gender: node.gender || null,
              birthYear: node.birthYear || null,
              isDeceased: node.isDeceased || false,
            },
          });
          personId = person.id;
        }

        tempToPersonId[node.tempId] = personId;

        const treeNode = await tx.treeNode.create({
          data: {
            communityId: community.id,
            personId,
          },
        });
        tempToNodeId[node.tempId] = treeNode.id;
      }

      // 4. Create Couples
      const coupleMap: Record<string, string> = {}; // "spouse1TempId:spouse2TempId" → coupleId
      for (const couple of dto.couples) {
        const created = await tx.couple.create({
          data: {
            communityId: community.id,
            spouse1Id: tempToNodeId[couple.spouse1],
            spouse2Id: tempToNodeId[couple.spouse2],
          },
        });
        coupleMap[`${couple.spouse1}:${couple.spouse2}`] = created.id;
      }

      // 5. Create CoupleChild rows
      for (const child of dto.children) {
        const coupleKey = `${child.coupleSpouse1}:${child.coupleSpouse2}`;
        const coupleId = coupleMap[coupleKey];
        if (!coupleId) {
          throw new BadRequestException(
            `No couple found for ${child.coupleSpouse1} + ${child.coupleSpouse2}`,
          );
        }
        await tx.coupleChild.create({
          data: {
            coupleId,
            childId: tempToNodeId[child.childRef],
            sortOrder: child.sortOrder,
          },
        });
      }

      // 6. Create CommunityAdmin for the self node
      const selfNodeId = tempToNodeId[selfNode.tempId];
      await tx.communityAdmin.create({
        data: {
          communityId: community.id,
          userId,
          role: 'primary',
          treeNodeId: selfNodeId,
        },
      });

      return { id: community.id, name: community.name };
    });
  }

  async listCommunities(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        person: {
          include: {
            treeNodes: {
              include: {
                community: true,
              },
            },
          },
        },
      },
    });

    if (!user?.person) return [];

    return user.person.treeNodes.map((tn) => ({
      id: tn.community.id,
      name: tn.community.name,
      createdAt: tn.community.createdAt,
    }));
  }

  async getCommunity(communityId: string) {
    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
      include: {
        admins: { include: { user: true } },
        _count: { select: { treeNodes: true, couples: true } },
      },
    });

    if (!community) throw new NotFoundException('Community not found');

    return {
      id: community.id,
      name: community.name,
      createdAt: community.createdAt,
      nodeCount: community._count.treeNodes,
      coupleCount: community._count.couples,
      admins: community.admins.map((a) => ({
        userId: a.userId,
        displayName: a.user.displayName,
        role: a.role,
      })),
    };
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd apps/api && npx jest src/communities/communities.service.spec.ts`
Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/communities/
git commit -m "feat(api): implement community creation wizard and listing"
```

---

### Task 4: Communities Controller

**Files:**
- Create: `apps/api/src/communities/communities.controller.ts`
- Create: `apps/api/src/communities/communities.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create controller**

Create `apps/api/src/communities/communities.controller.ts`:

```typescript
import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { CommunitiesService } from './communities.service';
import { CreateCommunityDto } from './dto/create-community.dto';
import { CurrentUser, RequestUser } from '../auth/user.decorator';
import { CommunityMemberGuard } from './community-member.guard';

@Controller('communities')
export class CommunitiesController {
  constructor(private readonly communitiesService: CommunitiesService) {}

  @Get()
  async list(@CurrentUser() user: RequestUser) {
    return this.communitiesService.listCommunities(user.userId);
  }

  @Post()
  async create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateCommunityDto,
  ) {
    return this.communitiesService.createCommunity(dto, user.userId);
  }

  @Get(':id')
  @UseGuards(CommunityMemberGuard)
  async get(@Param('id') id: string) {
    return this.communitiesService.getCommunity(id);
  }
}
```

- [ ] **Step 2: Create module**

Create `apps/api/src/communities/communities.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { CommunitiesController } from './communities.controller';
import { CommunitiesService } from './communities.service';

@Module({
  controllers: [CommunitiesController],
  providers: [CommunitiesService],
  exports: [CommunitiesService],
})
export class CommunitiesModule {}
```

- [ ] **Step 3: Register in AppModule**

Add `CommunitiesModule` to imports in `apps/api/src/app.module.ts`:

```typescript
import { CommunitiesModule } from './communities/communities.module';

@Module({
  imports: [
    // ... existing
    CommunitiesModule,
  ],
  // ...
})
export class AppModule {}
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/
git commit -m "feat(api): add communities controller and module"
```

---

### Task 5: Tree Fetch Service (TDD)

**Files:**
- Create: `apps/api/src/tree/tree.service.ts`
- Create: `apps/api/src/tree/tree.service.spec.ts`

- [ ] **Step 1: Write failing test for tree fetch**

Create `apps/api/src/tree/tree.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { TreeService } from './tree.service';
import { PrismaService } from '@family-tree/database';

describe('TreeService', () => {
  let service: TreeService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      community: { findUnique: jest.fn() },
      treeNode: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
      couple: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      coupleChild: {
        findMany: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
      },
      person: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
      },
      $transaction: jest.fn((fn) => fn(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TreeService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<TreeService>(TreeService);
  });

  describe('getTree', () => {
    it('returns tree with computed bloodline status', async () => {
      prisma.community.findUnique.mockResolvedValue({ id: 'c1', name: 'Family' });

      prisma.treeNode.findMany.mockResolvedValue([
        { id: 'n1', personId: 'p1', person: { id: 'p1', profileId: 'dad', name: 'Dad', gender: 'M', birthYear: 1960, deathYear: null, isDeceased: false, userId: null, user: null } },
        { id: 'n2', personId: 'p2', person: { id: 'p2', profileId: 'mom', name: 'Mom', gender: 'F', birthYear: 1963, deathYear: null, isDeceased: false, userId: null, user: null } },
        { id: 'n3', personId: 'p3', person: { id: 'p3', profileId: 'kid', name: 'Kid', gender: 'M', birthYear: 1990, deathYear: null, isDeceased: false, userId: null, user: null } },
      ]);

      prisma.couple.findMany.mockResolvedValue([
        { id: 'cp1', spouse1Id: 'n1', spouse2Id: 'n2', status: 'married', marriageDate: null, divorceDate: null },
      ]);

      prisma.coupleChild.findMany.mockResolvedValue([
        { coupleId: 'cp1', childId: 'n3', sortOrder: 0 },
      ]);

      const result = await service.getTree('c1');

      expect(result.communityName).toBe('Family');
      expect(result.people).toHaveLength(3);
      expect(result.couples).toHaveLength(1);
      // Root couple: neither has parents → storage order
      expect(result.couples[0].spouseAId).toBe('n1');
      expect(result.couples[0].spouseBId).toBe('n2');
      expect(result.couples[0].children).toEqual(['n3']);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && npx jest src/tree/tree.service.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Implement TreeService.getTree**

Create `apps/api/src/tree/tree.service.ts`:

```typescript
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import {
  PrismaService,
  generateProfileId,
  computeBloodlineStatus,
} from '@family-tree/database';

@Injectable()
export class TreeService {
  constructor(private readonly prisma: PrismaService) {}

  async getTree(communityId: string) {
    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
    });
    if (!community) throw new NotFoundException('Community not found');

    const treeNodes = await this.prisma.treeNode.findMany({
      where: { communityId },
      include: {
        person: { include: { user: true } },
      },
    });

    const couples = await this.prisma.couple.findMany({
      where: { communityId },
    });

    const coupleChildren = await this.prisma.coupleChild.findMany({
      where: { couple: { communityId } },
      orderBy: { sortOrder: 'asc' },
    });

    // Build a set of nodeIds that appear as children (have parents)
    const nodesWithParents = new Set(coupleChildren.map((cc) => cc.childId));

    // Compute bloodline for each couple
    const computedCouples = couples.map((couple) => {
      const bloodline = computeBloodlineStatus({
        spouse1Id: couple.spouse1Id,
        spouse2Id: couple.spouse2Id,
        spouse1HasParents: nodesWithParents.has(couple.spouse1Id),
        spouse2HasParents: nodesWithParents.has(couple.spouse2Id),
      });

      const children = coupleChildren
        .filter((cc) => cc.coupleId === couple.id)
        .map((cc) => cc.childId);

      return {
        id: couple.id,
        spouseAId: bloodline.spouseAId,
        spouseBId: bloodline.spouseBId,
        status: couple.status,
        marriageDate: couple.marriageDate,
        divorceDate: couple.divorceDate,
        children,
      };
    });

    // Find root couple: couple where neither spouse has parents
    const rootCouple = computedCouples.find(
      (c) => !nodesWithParents.has(c.spouseAId) && !nodesWithParents.has(c.spouseBId),
    );

    // Sort: root couple first
    if (rootCouple) {
      const idx = computedCouples.indexOf(rootCouple);
      if (idx > 0) {
        computedCouples.splice(idx, 1);
        computedCouples.unshift(rootCouple);
      }
    }

    const people = treeNodes.map((tn) => {
      const person = tn.person;
      const user = person.user;
      return {
        nodeId: tn.id,
        personId: person.id,
        profileId: person.profileId,
        name: user?.displayName || person.name,
        birthYear: person.birthYear,
        deathYear: person.deathYear,
        isDeceased: person.isDeceased,
        gender: person.gender,
        profilePhoto: user?.profilePhoto || null,
        isRegisteredUser: !!user,
      };
    });

    return {
      communityId,
      communityName: community.name,
      people,
      couples: computedCouples,
    };
  }

  async addSpouse(
    communityId: string,
    treeNodeId: string,
    spouseData: { name: string; gender?: string; birthYear?: number; isDeceased?: boolean },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existingNode = await tx.treeNode.findUnique({
        where: { id: treeNodeId },
        include: { spouse1In: true, spouse2In: true },
      });
      if (!existingNode) throw new NotFoundException('Tree node not found');
      if (existingNode.communityId !== communityId) {
        throw new BadRequestException('Node does not belong to this community');
      }
      if (existingNode.spouse1In || existingNode.spouse2In) {
        throw new ConflictException('Person already has a spouse');
      }

      const checkExists = async (pid: string) => {
        const count = await tx.person.count({ where: { profileId: pid } });
        return count > 0;
      };
      const profileId = await generateProfileId(spouseData.name, checkExists);

      const person = await tx.person.create({
        data: {
          profileId,
          name: spouseData.name,
          gender: spouseData.gender || null,
          birthYear: spouseData.birthYear || null,
          isDeceased: spouseData.isDeceased || false,
        },
      });

      const spouseNode = await tx.treeNode.create({
        data: { communityId, personId: person.id },
      });

      const couple = await tx.couple.create({
        data: {
          communityId,
          spouse1Id: treeNodeId,
          spouse2Id: spouseNode.id,
        },
      });

      return { coupleId: couple.id, spouseNodeId: spouseNode.id, personId: person.id };
    });
  }

  async addChild(
    communityId: string,
    coupleId: string,
    childData: { name: string; gender?: string; birthYear?: number; isDeceased?: boolean },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const couple = await tx.couple.findUnique({ where: { id: coupleId } });
      if (!couple) throw new NotFoundException('Couple not found');
      if (couple.communityId !== communityId) {
        throw new BadRequestException('Couple does not belong to this community');
      }

      const childCount = await tx.coupleChild.count({
        where: { coupleId },
      });

      const checkExists = async (pid: string) => {
        const count = await tx.person.count({ where: { profileId: pid } });
        return count > 0;
      };
      const profileId = await generateProfileId(childData.name, checkExists);

      const person = await tx.person.create({
        data: {
          profileId,
          name: childData.name,
          gender: childData.gender || null,
          birthYear: childData.birthYear || null,
          isDeceased: childData.isDeceased || false,
        },
      });

      const childNode = await tx.treeNode.create({
        data: { communityId, personId: person.id },
      });

      await tx.coupleChild.create({
        data: {
          coupleId,
          childId: childNode.id,
          sortOrder: childCount,
        },
      });

      return { childNodeId: childNode.id, personId: person.id };
    });
  }

  async addParents(
    communityId: string,
    treeNodeId: string,
    parentsData: {
      parent1: { name: string; gender?: string; birthYear?: number; isDeceased?: boolean };
      parent2: { name: string; gender?: string; birthYear?: number; isDeceased?: boolean };
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Verify the node exists and is a root couple member
      const node = await tx.treeNode.findUnique({
        where: { id: treeNodeId },
        include: { childIn: true, spouse1In: true, spouse2In: true },
      });
      if (!node) throw new NotFoundException('Tree node not found');
      if (node.communityId !== communityId) {
        throw new BadRequestException('Node does not belong to this community');
      }
      if (node.childIn.length > 0) {
        throw new BadRequestException(
          'This person already has parents. add-parents is only available for root couple members.',
        );
      }

      // Verify the node is part of a couple (root couple)
      const couple = node.spouse1In || node.spouse2In;
      if (!couple) {
        throw new BadRequestException(
          'Node must be part of a couple to add parents',
        );
      }

      // Verify neither spouse of the root couple has parents (confirming it IS the root)
      const spouseId = couple.spouse1Id === treeNodeId ? couple.spouse2Id : couple.spouse1Id;
      const spouseChildIn = await tx.coupleChild.findMany({
        where: { childId: spouseId },
      });
      if (spouseChildIn.length > 0) {
        throw new BadRequestException(
          'The other spouse already has parents. Only root couple members can add parents.',
        );
      }

      const checkExists = async (pid: string) => {
        const count = await tx.person.count({ where: { profileId: pid } });
        return count > 0;
      };

      // Create parent 1
      const profileId1 = await generateProfileId(parentsData.parent1.name, checkExists);
      const person1 = await tx.person.create({
        data: {
          profileId: profileId1,
          name: parentsData.parent1.name,
          gender: parentsData.parent1.gender || null,
          birthYear: parentsData.parent1.birthYear || null,
          isDeceased: parentsData.parent1.isDeceased || false,
        },
      });
      const parentNode1 = await tx.treeNode.create({
        data: { communityId, personId: person1.id },
      });

      // Create parent 2
      const profileId2 = await generateProfileId(parentsData.parent2.name, checkExists);
      const person2 = await tx.person.create({
        data: {
          profileId: profileId2,
          name: parentsData.parent2.name,
          gender: parentsData.parent2.gender || null,
          birthYear: parentsData.parent2.birthYear || null,
          isDeceased: parentsData.parent2.isDeceased || false,
        },
      });
      const parentNode2 = await tx.treeNode.create({
        data: { communityId, personId: person2.id },
      });

      // Create parents couple
      const parentsCouple = await tx.couple.create({
        data: {
          communityId,
          spouse1Id: parentNode1.id,
          spouse2Id: parentNode2.id,
        },
      });

      // Link target node as child of the new parents couple
      await tx.coupleChild.create({
        data: {
          coupleId: parentsCouple.id,
          childId: treeNodeId,
          sortOrder: 0,
        },
      });

      return {
        parentsCoupleId: parentsCouple.id,
        parent1NodeId: parentNode1.id,
        parent2NodeId: parentNode2.id,
      };
    });
  }

  async addSibling(
    communityId: string,
    treeNodeId: string,
    siblingData: { name: string; gender?: string; birthYear?: number; isDeceased?: boolean },
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Find the node's parents
      const childEntry = await tx.coupleChild.findFirst({
        where: {
          childId: treeNodeId,
          couple: { communityId },
        },
      });
      if (!childEntry) {
        throw new BadRequestException(
          'This person has no parents in this community. Cannot add sibling.',
        );
      }

      const siblingCount = await tx.coupleChild.count({
        where: { coupleId: childEntry.coupleId },
      });

      const checkExists = async (pid: string) => {
        const count = await tx.person.count({ where: { profileId: pid } });
        return count > 0;
      };
      const profileId = await generateProfileId(siblingData.name, checkExists);

      const person = await tx.person.create({
        data: {
          profileId,
          name: siblingData.name,
          gender: siblingData.gender || null,
          birthYear: siblingData.birthYear || null,
          isDeceased: siblingData.isDeceased || false,
        },
      });

      const siblingNode = await tx.treeNode.create({
        data: { communityId, personId: person.id },
      });

      await tx.coupleChild.create({
        data: {
          coupleId: childEntry.coupleId,
          childId: siblingNode.id,
          sortOrder: siblingCount,
        },
      });

      return { siblingNodeId: siblingNode.id, personId: person.id };
    });
  }

  async editNode(
    communityId: string,
    treeNodeId: string,
    data: { name?: string; birthYear?: number | null; deathYear?: number | null; isDeceased?: boolean; gender?: string | null },
    requestUserId: string,
  ) {
    const node = await this.prisma.treeNode.findUnique({
      where: { id: treeNodeId },
      include: { person: { include: { user: true } } },
    });
    if (!node) throw new NotFoundException('Tree node not found');
    if (node.communityId !== communityId) {
      throw new BadRequestException('Node does not belong to this community');
    }

    // If person is a registered user and the requester is NOT that user,
    // only allow admin-editable fields (deathYear, isDeceased)
    const personOwnsAccount = node.person.user !== null;
    const requesterIsOwner = node.person.user?.id === requestUserId;

    const updateData: Record<string, any> = {};

    if (data.deathYear !== undefined) updateData.deathYear = data.deathYear;
    if (data.isDeceased !== undefined) updateData.isDeceased = data.isDeceased;

    if (!personOwnsAccount || requesterIsOwner) {
      // Can edit all fields
      if (data.name !== undefined) updateData.name = data.name;
      if (data.birthYear !== undefined) updateData.birthYear = data.birthYear;
      if (data.gender !== undefined) updateData.gender = data.gender;
    }

    const updated = await this.prisma.person.update({
      where: { id: node.personId },
      data: updateData,
    });

    return updated;
  }

  async removeNode(communityId: string, treeNodeId: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Find the node
      const node = await tx.treeNode.findUnique({
        where: { id: treeNodeId },
        include: {
          spouse1In: { include: { children: true } },
          spouse2In: { include: { children: true } },
          childIn: true,
          person: { include: { user: true, treeNodes: true } },
        },
      });
      if (!node) throw new NotFoundException('Tree node not found');
      if (node.communityId !== communityId) {
        throw new BadRequestException('Node does not belong to this community');
      }

      const couple = node.spouse1In || node.spouse2In;
      const deletedNodeIds: string[] = [];

      if (couple && couple.children.length > 0) {
        throw new ConflictException(
          'Cannot remove a person whose couple has children. Remove descendants first.',
        );
      }

      if (couple) {
        // Determine bloodline vs married-in
        const nodeIsSpouse1 = couple.spouse1Id === treeNodeId;
        const otherSpouseId = nodeIsSpouse1 ? couple.spouse2Id : couple.spouse1Id;

        const nodeHasParents = node.childIn.length > 0;
        const otherChildIn = await tx.coupleChild.findMany({
          where: { childId: otherSpouseId },
        });
        const otherHasParents = otherChildIn.length > 0;

        // Delete couple
        await tx.couple.delete({ where: { id: couple.id } });

        if (nodeHasParents && !otherHasParents) {
          // Target is bloodline, other is married-in → delete both
          // Remove target from parent's children
          await tx.coupleChild.deleteMany({ where: { childId: treeNodeId } });
          // Delete the married-in spouse's node
          const otherNode = await tx.treeNode.findUnique({
            where: { id: otherSpouseId },
            include: { person: { include: { treeNodes: true, user: true } } },
          });
          await tx.treeNode.delete({ where: { id: otherSpouseId } });
          deletedNodeIds.push(otherSpouseId);
          // Clean up person if orphaned
          if (otherNode && otherNode.person.treeNodes.length <= 1 && !otherNode.person.user) {
            await tx.person.delete({ where: { id: otherNode.personId } });
          }
          // Delete target node
          await tx.treeNode.delete({ where: { id: treeNodeId } });
          deletedNodeIds.push(treeNodeId);
        } else if (!nodeHasParents && otherHasParents) {
          // Target is married-in → delete only target
          await tx.treeNode.delete({ where: { id: treeNodeId } });
          deletedNodeIds.push(treeNodeId);
        } else {
          // Both have parents or neither → delete target, keep other
          await tx.coupleChild.deleteMany({ where: { childId: treeNodeId } });
          await tx.treeNode.delete({ where: { id: treeNodeId } });
          deletedNodeIds.push(treeNodeId);
        }
      } else {
        // No couple — just delete the node
        await tx.coupleChild.deleteMany({ where: { childId: treeNodeId } });
        await tx.treeNode.delete({ where: { id: treeNodeId } });
        deletedNodeIds.push(treeNodeId);
      }

      // Clean up person if no remaining tree nodes and no user account
      if (node.person.treeNodes.length <= 1 && !node.person.user) {
        await tx.person.delete({ where: { id: node.personId } }).catch(() => {});
      }

      return { deleted: deletedNodeIds };
    });
  }
}
```

- [ ] **Step 4: Run tests**

Run: `cd apps/api && npx jest src/tree/tree.service.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/tree/
git commit -m "feat(api): implement tree service with all operations and deletion logic"
```

---

### Task 6: Tree Controller & DTOs

**Files:**
- Create: `apps/api/src/tree/dto/add-spouse.dto.ts`
- Create: `apps/api/src/tree/dto/add-child.dto.ts`
- Create: `apps/api/src/tree/dto/add-parents.dto.ts`
- Create: `apps/api/src/tree/dto/add-sibling.dto.ts`
- Create: `apps/api/src/tree/dto/edit-node.dto.ts`
- Create: `apps/api/src/tree/tree.controller.ts`
- Create: `apps/api/src/tree/tree.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create DTOs**

Create `apps/api/src/tree/dto/add-spouse.dto.ts`:

```typescript
import { IsString, MinLength, IsOptional, IsInt, Min, Max, IsBoolean } from 'class-validator';

export class AddSpouseDto {
  @IsString()
  treeNodeId: string;

  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(2100)
  birthYear?: number;

  @IsOptional()
  @IsBoolean()
  isDeceased?: boolean;
}
```

Create `apps/api/src/tree/dto/add-child.dto.ts`:

```typescript
import { IsString, MinLength, IsOptional, IsInt, Min, Max, IsBoolean } from 'class-validator';

export class AddChildDto {
  @IsString()
  coupleId: string;

  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(2100)
  birthYear?: number;

  @IsOptional()
  @IsBoolean()
  isDeceased?: boolean;
}
```

Create `apps/api/src/tree/dto/add-parents.dto.ts`:

```typescript
import { IsString, MinLength, IsOptional, IsInt, Min, Max, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ParentDataDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(2100)
  birthYear?: number;

  @IsOptional()
  @IsBoolean()
  isDeceased?: boolean;
}

export class AddParentsDto {
  @IsString()
  treeNodeId: string;

  @ValidateNested()
  @Type(() => ParentDataDto)
  parent1: ParentDataDto;

  @ValidateNested()
  @Type(() => ParentDataDto)
  parent2: ParentDataDto;
}
```

Create `apps/api/src/tree/dto/add-sibling.dto.ts`:

```typescript
import { IsString, MinLength, IsOptional, IsInt, Min, Max, IsBoolean } from 'class-validator';

export class AddSiblingDto {
  @IsString()
  treeNodeId: string;

  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(2100)
  birthYear?: number;

  @IsOptional()
  @IsBoolean()
  isDeceased?: boolean;
}
```

Create `apps/api/src/tree/dto/edit-node.dto.ts`:

```typescript
import { IsString, MinLength, IsOptional, IsInt, Min, Max, IsBoolean } from 'class-validator';

export class EditNodeDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(2100)
  birthYear?: number;

  @IsOptional()
  @IsInt()
  deathYear?: number;

  @IsOptional()
  @IsBoolean()
  isDeceased?: boolean;

  @IsOptional()
  @IsString()
  gender?: string;
}
```

- [ ] **Step 2: Create tree controller**

Create `apps/api/src/tree/tree.controller.ts`:

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { TreeService } from './tree.service';
import { CommunityAdminGuard } from '../communities/community-admin.guard';
import { CommunityMemberGuard } from '../communities/community-member.guard';
import { CurrentUser, RequestUser } from '../auth/user.decorator';
import { AddSpouseDto } from './dto/add-spouse.dto';
import { AddChildDto } from './dto/add-child.dto';
import { AddParentsDto } from './dto/add-parents.dto';
import { AddSiblingDto } from './dto/add-sibling.dto';
import { EditNodeDto } from './dto/edit-node.dto';

@Controller('communities/:id/tree')
export class TreeController {
  constructor(private readonly treeService: TreeService) {}

  @Get()
  @UseGuards(CommunityMemberGuard)
  async getTree(@Param('id') communityId: string) {
    return this.treeService.getTree(communityId);
  }

  @Post('add-spouse')
  @UseGuards(CommunityAdminGuard)
  async addSpouse(
    @Param('id') communityId: string,
    @Body() dto: AddSpouseDto,
  ) {
    return this.treeService.addSpouse(communityId, dto.treeNodeId, {
      name: dto.name,
      gender: dto.gender,
      birthYear: dto.birthYear,
      isDeceased: dto.isDeceased,
    });
  }

  @Post('add-child')
  @UseGuards(CommunityAdminGuard)
  async addChild(
    @Param('id') communityId: string,
    @Body() dto: AddChildDto,
  ) {
    return this.treeService.addChild(communityId, dto.coupleId, {
      name: dto.name,
      gender: dto.gender,
      birthYear: dto.birthYear,
      isDeceased: dto.isDeceased,
    });
  }

  @Post('add-parents')
  @UseGuards(CommunityAdminGuard)
  async addParents(
    @Param('id') communityId: string,
    @Body() dto: AddParentsDto,
  ) {
    return this.treeService.addParents(communityId, dto.treeNodeId, {
      parent1: dto.parent1,
      parent2: dto.parent2,
    });
  }

  @Post('add-sibling')
  @UseGuards(CommunityAdminGuard)
  async addSibling(
    @Param('id') communityId: string,
    @Body() dto: AddSiblingDto,
  ) {
    return this.treeService.addSibling(communityId, dto.treeNodeId, {
      name: dto.name,
      gender: dto.gender,
      birthYear: dto.birthYear,
      isDeceased: dto.isDeceased,
    });
  }

  @Put('nodes/:nodeId')
  @UseGuards(CommunityAdminGuard)
  async editNode(
    @Param('id') communityId: string,
    @Param('nodeId') nodeId: string,
    @Body() dto: EditNodeDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.treeService.editNode(communityId, nodeId, dto, user.userId);
  }

  @Delete('nodes/:nodeId')
  @UseGuards(CommunityAdminGuard)
  async removeNode(
    @Param('id') communityId: string,
    @Param('nodeId') nodeId: string,
  ) {
    return this.treeService.removeNode(communityId, nodeId);
  }
}
```

- [ ] **Step 3: Create tree module**

Create `apps/api/src/tree/tree.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TreeController } from './tree.controller';
import { TreeService } from './tree.service';

@Module({
  controllers: [TreeController],
  providers: [TreeService],
  exports: [TreeService],
})
export class TreeModule {}
```

- [ ] **Step 4: Register TreeModule in AppModule**

Add `TreeModule` to imports in `apps/api/src/app.module.ts`:

```typescript
import { TreeModule } from './tree/tree.module';

@Module({
  imports: [
    // ... existing
    TreeModule,
  ],
  // ...
})
export class AppModule {}
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/
git commit -m "feat(api): add tree controller with all DTOs and operations"
```

---

### Task 7: Tree Layout Service

**Files:**
- Create: `packages/database/src/tree-layout.ts`
- Create: `packages/database/src/tree-layout.test.ts`
- Modify: `packages/database/src/index.ts`

- [ ] **Step 1: Write failing test**

Create `packages/database/src/tree-layout.test.ts`:

```typescript
import { computeTreeLayout, LayoutConstants } from './tree-layout';

const DEFAULTS: LayoutConstants = {
  NODE_W: 120,
  NODE_H: 60,
  SPOUSE_GAP: 12,
  SUBTREE_GAP: 48,
  ROW_HEIGHT: 120,
  PADDING: 40,
};

describe('computeTreeLayout', () => {
  it('computes layout for a simple root couple with one child', () => {
    const couples = [
      {
        id: 'c1',
        spouseAId: 'nA',
        spouseBId: 'nB',
        children: ['nC'],
      },
    ];
    const personCoupleMap: Record<string, string> = {}; // nC has no couple

    const result = computeTreeLayout(couples, personCoupleMap, DEFAULTS);

    expect(result.couples['c1']).toBeDefined();
    expect(result.couples['c1'].gen).toBe(0);
    expect(result.couples['c1'].y).toBe(DEFAULTS.PADDING);
    expect(result.soloNodes['nC']).toBeDefined();
    expect(result.soloNodes['nC'].y).toBe(DEFAULTS.ROW_HEIGHT + DEFAULTS.PADDING);
    expect(result.canvasWidth).toBeGreaterThan(0);
    expect(result.canvasHeight).toBeGreaterThan(0);
  });

  it('handles a married child (two generations of couples)', () => {
    const couples = [
      { id: 'c1', spouseAId: 'nA', spouseBId: 'nB', children: ['nC'] },
      { id: 'c2', spouseAId: 'nC', spouseBId: 'nD', children: [] },
    ];
    const personCoupleMap: Record<string, string> = { nC: 'c2' };

    const result = computeTreeLayout(couples, personCoupleMap, DEFAULTS);

    expect(result.couples['c1'].gen).toBe(0);
    expect(result.couples['c2'].gen).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/database && npx jest src/tree-layout.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement tree layout**

Create `packages/database/src/tree-layout.ts`:

```typescript
export interface LayoutConstants {
  NODE_W: number;
  NODE_H: number;
  SPOUSE_GAP: number;
  SUBTREE_GAP: number;
  ROW_HEIGHT: number;
  PADDING: number;
}

export interface LayoutCouple {
  id: string;
  spouseAId: string;
  spouseBId: string;
  children: string[]; // nodeIds
}

interface CoupleLayout {
  gen: number;
  subtreeWidth: number;
  cx: number;
  y: number;
  yBot: number;
  spouseAX: number;
  spouseBX: number;
}

interface SoloNodeLayout {
  x: number;
  y: number;
  cx: number;
}

export interface TreeLayoutResult {
  couples: Record<string, CoupleLayout>;
  soloNodes: Record<string, SoloNodeLayout>;
  canvasWidth: number;
  canvasHeight: number;
}

export function computeTreeLayout(
  couples: LayoutCouple[],
  personCoupleMap: Record<string, string>, // nodeId → coupleId (for children who have their own couple)
  constants: LayoutConstants,
): TreeLayoutResult {
  const { NODE_W, NODE_H, SPOUSE_GAP, SUBTREE_GAP, ROW_HEIGHT, PADDING } = constants;
  const COUPLE_W = NODE_W * 2 + SPOUSE_GAP;

  const coupleById: Record<string, LayoutCouple & { gen: number; subtreeWidth: number; cx: number }> = {};
  couples.forEach((c) => {
    coupleById[c.id] = { ...c, gen: -1, subtreeWidth: 0, cx: 0 };
  });

  // Phase 1: Generation assignment (BFS from root = couples[0])
  if (couples.length === 0) {
    return { couples: {}, soloNodes: {}, canvasWidth: 0, canvasHeight: 0 };
  }

  const root = coupleById[couples[0].id];
  root.gen = 0;
  const queue = [root];

  while (queue.length > 0) {
    const couple = queue.shift()!;
    for (const childId of couple.children) {
      const childCoupleId = personCoupleMap[childId];
      if (childCoupleId && coupleById[childCoupleId] && coupleById[childCoupleId].gen === -1) {
        coupleById[childCoupleId].gen = couple.gen + 1;
        queue.push(coupleById[childCoupleId]);
      }
    }
  }

  // Phase 2: Subtree widths (bottom-up)
  const maxGen = Math.max(...Object.values(coupleById).map((c) => c.gen).filter((g) => g >= 0));

  for (let gen = maxGen; gen >= 0; gen--) {
    const genCouples = Object.values(coupleById).filter((c) => c.gen === gen);

    for (const couple of genCouples) {
      const childCouples = couple.children
        .map((cid) => personCoupleMap[cid])
        .filter(Boolean)
        .map((cpId) => coupleById[cpId!])
        .filter(Boolean);

      const soloCount = couple.children.filter((cid) => !personCoupleMap[cid]).length;
      const soloWidth = soloCount > 0
        ? soloCount * NODE_W + (soloCount - 1) * SUBTREE_GAP
        : 0;

      if (childCouples.length === 0) {
        couple.subtreeWidth = Math.max(COUPLE_W, soloWidth || COUPLE_W);
      } else {
        const coupledWidth =
          childCouples.reduce((s, cc) => s + cc.subtreeWidth, 0) +
          (childCouples.length - 1) * SUBTREE_GAP;
        couple.subtreeWidth = Math.max(COUPLE_W, coupledWidth, soloWidth);
      }
    }
  }

  // Phase 3: X/Y positions (top-down BFS)
  root.cx = root.subtreeWidth / 2 + PADDING;
  const posQueue = [root];
  const soloNodes: Record<string, SoloNodeLayout> = {};

  while (posQueue.length > 0) {
    const couple = posQueue.shift()!;

    const childCouples = couple.children
      .map((cid) => personCoupleMap[cid])
      .filter(Boolean)
      .map((cpId) => coupleById[cpId!])
      .filter(Boolean);

    if (childCouples.length > 0) {
      const totalW =
        childCouples.reduce((s, cc) => s + cc.subtreeWidth, 0) +
        (childCouples.length - 1) * SUBTREE_GAP;
      let x = couple.cx - totalW / 2;
      for (const cc of childCouples) {
        cc.cx = x + cc.subtreeWidth / 2;
        x += cc.subtreeWidth + SUBTREE_GAP;
        posQueue.push(cc);
      }
    }

    // Position solo leaf children
    const soloIds = couple.children.filter((cid) => !personCoupleMap[cid]);
    if (soloIds.length > 0) {
      const totalW = soloIds.length * NODE_W + (soloIds.length - 1) * SUBTREE_GAP;
      let x = couple.cx - totalW / 2;
      for (const nodeId of soloIds) {
        soloNodes[nodeId] = {
          x,
          y: (couple.gen + 1) * ROW_HEIGHT + PADDING,
          cx: x + NODE_W / 2,
        };
        x += NODE_W + SUBTREE_GAP;
      }
    }
  }

  // Build result
  const coupleLayouts: Record<string, CoupleLayout> = {};
  for (const c of Object.values(coupleById)) {
    if (c.gen < 0) continue;
    coupleLayouts[c.id] = {
      gen: c.gen,
      subtreeWidth: c.subtreeWidth,
      cx: c.cx,
      y: c.gen * ROW_HEIGHT + PADDING,
      yBot: c.gen * ROW_HEIGHT + PADDING + NODE_H,
      spouseAX: c.cx - SPOUSE_GAP / 2 - NODE_W,
      spouseBX: c.cx + SPOUSE_GAP / 2,
    };
  }

  const hasSoloNodes = Object.keys(soloNodes).length > 0;
  const maxGenForHeight = hasSoloNodes ? maxGen + 1 : maxGen;

  return {
    couples: coupleLayouts,
    soloNodes,
    canvasWidth: root.subtreeWidth + PADDING * 2,
    canvasHeight: (maxGenForHeight + 1) * ROW_HEIGHT + PADDING * 2,
  };
}
```

- [ ] **Step 4: Run tests**

Run: `cd packages/database && npx jest src/tree-layout.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Export from index**

Add to `packages/database/src/index.ts`:

```typescript
export { computeTreeLayout } from './tree-layout';
export type { LayoutConstants, LayoutCouple, TreeLayoutResult } from './tree-layout';
```

- [ ] **Step 6: Commit**

```bash
git add packages/database/src/
git commit -m "feat(db): implement 4-phase tree layout algorithm with tests"
```

---

### Task 8: Integration Verification

**Files:** None (verification only)

- [ ] **Step 1: Run all tests**

Run: `pnpm run test` (from root)
Expected: All tests pass — database package tests + API service tests.

- [ ] **Step 2: Start API server and test community creation**

Start: `pnpm run api`

```bash
# 1. Create and authenticate a user
curl -s -X POST http://localhost:3000/api/auth/invite \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","displayName":"Admin User"}'
# Get magicLinkToken, then verify:
curl -s http://localhost:3000/api/auth/verify/<TOKEN>
# Get accessToken

# 2. Create a community with wizard
curl -s -X POST http://localhost:3000/api/communities \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Family",
    "nodes": [
      {"tempId":"t1","name":"Grandpa","gender":"M","birthYear":1940,"isDeceased":true},
      {"tempId":"t2","name":"Grandma","gender":"F","birthYear":1943},
      {"tempId":"t3","name":"Dad","gender":"M","birthYear":1965},
      {"tempId":"t4","name":"Mom","gender":"F","birthYear":1968},
      {"tempId":"t5","name":"Me","gender":"M","birthYear":1990,"isSelf":true}
    ],
    "couples": [
      {"spouse1":"t1","spouse2":"t2"},
      {"spouse1":"t3","spouse2":"t4"}
    ],
    "children": [
      {"coupleSpouse1":"t1","coupleSpouse2":"t2","childRef":"t3","sortOrder":0},
      {"coupleSpouse1":"t3","coupleSpouse2":"t4","childRef":"t5","sortOrder":0}
    ]
  }'
# Expected: { id: "...", name: "My Family" }
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(api): complete communities and tree operations module"
```

---

## File Summary

| Path | Purpose |
|------|---------|
| `packages/database/src/bloodline.ts` | Bloodline/married-in computation |
| `packages/database/src/bloodline.test.ts` | Bloodline tests |
| `packages/database/src/tree-layout.ts` | 4-phase layout algorithm |
| `packages/database/src/tree-layout.test.ts` | Layout tests |
| `apps/api/src/communities/communities.module.ts` | Communities module |
| `apps/api/src/communities/communities.service.ts` | Community CRUD + wizard creation |
| `apps/api/src/communities/communities.service.spec.ts` | Community service tests |
| `apps/api/src/communities/communities.controller.ts` | Community endpoints |
| `apps/api/src/communities/community-member.guard.ts` | Membership guard |
| `apps/api/src/communities/community-admin.guard.ts` | Admin guard |
| `apps/api/src/communities/dto/create-community.dto.ts` | Wizard DTO |
| `apps/api/src/tree/tree.module.ts` | Tree module |
| `apps/api/src/tree/tree.service.ts` | All tree operations + deletion logic |
| `apps/api/src/tree/tree.service.spec.ts` | Tree service tests |
| `apps/api/src/tree/tree.controller.ts` | Tree endpoints |
| `apps/api/src/tree/dto/*.dto.ts` | DTOs for add-spouse/child/parents/sibling/edit |
