# Cross-Community Linking & Relationship Finder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement cross-community linking (explicit for non-users, automatic for registered users), cross-community child auto-creation, and the BFS relationship finder (within-community + cross-community with privacy filtering).

**Architecture:** Link management lives in `apps/api/src/links/`. Relationship finder lives in `apps/api/src/relationship/`. Both share Prisma queries via services. Admin server mirrors link endpoints with elevated permissions (Plan 5).

**Tech Stack:** NestJS 11, Prisma 6, class-validator

**Spec:** `docs/superpowers/specs/2026-04-04-multi-community-family-tree-design.md` — Sections 7, 8, 5.2 (Links & Relationship endpoints)

**Depends on:** Plan 1 (Foundation) + Plan 2 (Auth & Users) + Plan 3 (Communities & Tree) completed.

---

### Task 1: Cross-Community Link DTOs

**Files:**
- Create: `apps/api/src/links/dto/request-link.dto.ts`
- Create: `apps/api/src/links/dto/approve-link.dto.ts`
- Create: `apps/api/src/links/dto/link-response.dto.ts`

- [ ] **Step 1: Create RequestLinkDto**

```typescript
// apps/api/src/links/dto/request-link.dto.ts
import { IsString } from 'class-validator';

export class RequestLinkDto {
  @IsString()
  treeNodeAId: string; // node in requesting admin's community

  @IsString()
  treeNodeBId: string; // node in target community
}
```

Validation rules (enforced in service, not DTO):
- Both TreeNodes must exist
- Both TreeNodes must be in **different** communities
- Requesting user must be a community admin of treeNodeA's community
- Neither TreeNode's Person should have a User (registered users don't need explicit links)
- No existing link between these two TreeNodes

- [ ] **Step 2: Create ApproveLinkDto**

```typescript
// apps/api/src/links/dto/approve-link.dto.ts
// No body needed — linkId comes from URL param
// But define a response type for consistency
```

- [ ] **Step 3: Create LinkResponseDto**

```typescript
// apps/api/src/links/dto/link-response.dto.ts
export class LinkResponseDto {
  id: string;
  treeNodeA: { id: string; personName: string; communityName: string };
  treeNodeB: { id: string; personName: string; communityName: string };
  status: string; // "pending" | "approved" | "rejected"
  createdAt: Date;
  actions: { action: string; actorType: string; createdAt: Date }[];
}
```

---

### Task 2: LinksService (TDD)

**Files:**
- Create: `apps/api/src/links/links.service.ts`
- Create: `apps/api/src/links/links.service.spec.ts`
- Create: `apps/api/src/links/links.module.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/api/src/links/links.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { LinksService } from './links.service';
import { PrismaService } from '@family-tree/database';

describe('LinksService', () => {
  let service: LinksService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        LinksService,
        {
          provide: PrismaService,
          useValue: {
            treeNode: { findUnique: jest.fn() },
            crossCommunityLink: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn() },
            crossCommunityLinkAction: { create: jest.fn() },
            $transaction: jest.fn((fn) => fn(prisma)),
          },
        },
      ],
    }).compile();

    service = module.get(LinksService);
    prisma = module.get(PrismaService);
  });

  describe('requestLink', () => {
    it('creates a pending link and logs the request action', async () => {
      // Mock both TreeNodes in different communities, no User on Person
      // Expect: CrossCommunityLink created with status "pending"
      // Expect: CrossCommunityLinkAction created with action "requested"
    });

    it('rejects if both TreeNodes are in the same community', async () => {
      // Expect: BadRequestException
    });

    it('rejects if either TreeNode Person has a User (registered)', async () => {
      // Expect: BadRequestException — use automatic linking instead
    });

    it('rejects if a link already exists between these nodes', async () => {
      // Expect: ConflictException
    });
  });

  describe('approveLink', () => {
    it('approves a pending link and logs the action', async () => {
      // Mock: existing link with status "pending"
      // Expect: status updated to "approved", action logged
    });

    it('rejects if link is not pending', async () => {
      // Expect: BadRequestException
    });

    it('validates requesting user is admin of the OTHER community', async () => {
      // The approver must be admin of the community they didn't request from
    });
  });

  describe('rejectLink', () => {
    it('rejects a pending link and logs the action', async () => {
      // Mock: existing link with status "pending"
      // Expect: status updated to "rejected", action logged
    });
  });

  describe('getPendingLinks', () => {
    it('returns pending links for communities the user administers', async () => {
      // Mock: user is admin of community X
      // Expect: pending links where treeNodeB is in community X
    });
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `cd apps/api && npx jest src/links/links.service.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Implement LinksService**

```typescript
// apps/api/src/links/links.service.ts
import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@family-tree/database';
import { RequestLinkDto } from './dto/request-link.dto';

@Injectable()
export class LinksService {
  constructor(private prisma: PrismaService) {}

  async requestLink(dto: RequestLinkDto, actorId: string) {
    // 1. Fetch both TreeNodes with Person and Community
    // 2. Validate different communities
    // 3. Validate neither Person has a User
    // 4. Check no existing link
    // 5. Transaction: create link (pending) + action log (requested)
  }

  async approveLink(linkId: string, actorId: string) {
    // 1. Fetch link, validate pending
    // 2. Validate actor is admin of treeNodeB's community
    // 3. Transaction: update status to approved + action log
  }

  async rejectLink(linkId: string, actorId: string) {
    // 1. Fetch link, validate pending
    // 2. Transaction: update status to rejected + action log
  }

  async getPendingLinks(userId: string) {
    // 1. Find communities where user is admin
    // 2. Return pending links where treeNodeB is in those communities
  }
}
```

- [ ] **Step 4: Run tests to verify passing**

Run: `cd apps/api && npx jest src/links/links.service.spec.ts`
Expected: PASS.

- [ ] **Step 5: Create LinksModule**

```typescript
// apps/api/src/links/links.module.ts
import { Module } from '@nestjs/common';
import { LinksService } from './links.service';
import { LinksController } from './links.controller';

@Module({
  controllers: [LinksController],
  providers: [LinksService],
  exports: [LinksService],
})
export class LinksModule {}
```

---

### Task 3: LinksController

**Files:**
- Create: `apps/api/src/links/links.controller.ts`

- [ ] **Step 1: Implement controller**

```typescript
// apps/api/src/links/links.controller.ts
import { Controller, Post, Put, Get, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { CommunityAdminGuard } from '../communities/guards/community-admin.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { LinksService } from './links.service';
import { RequestLinkDto } from './dto/request-link.dto';

@Controller('links')
@UseGuards(AuthGuard)
export class LinksController {
  constructor(private linksService: LinksService) {}

  @Post('request')
  async requestLink(@Body() dto: RequestLinkDto, @CurrentUser() user) {
    return this.linksService.requestLink(dto, user.id);
  }

  @Put(':id/approve')
  async approveLink(@Param('id') id: string, @CurrentUser() user) {
    return this.linksService.approveLink(id, user.id);
  }

  @Put(':id/reject')
  async rejectLink(@Param('id') id: string, @CurrentUser() user) {
    return this.linksService.rejectLink(id, user.id);
  }

  @Get('pending')
  async getPendingLinks(@CurrentUser() user) {
    return this.linksService.getPendingLinks(user.id);
  }
}
```

**Guard notes:**
- `requestLink` requires community admin of treeNodeA's community (validated in service)
- `approveLink`/`rejectLink` requires community admin of treeNodeB's community (validated in service)
- `getPendingLinks` returns links for all communities the user admins

---

### Task 4: Automatic Cross-Community Linking in Tree Operations

**Files:**
- Modify: `apps/api/src/tree/tree.service.ts` (or `packages/database/src/tree-operations.ts`)

This task extends the existing `add-spouse` and `add-child` operations from Plan 3.

- [ ] **Step 1: Extend add-spouse for registered users**

When adding a spouse who is a registered user with TreeNodes in other communities:
- The existing `add-spouse` creates a new TreeNode in the current community pointing to the **same Person** (already handled by the data model — `personId` FK)
- No `CrossCommunityLink` needed — cross-community identity is implicit via shared `personId`

Implementation detail in `add-spouse`:
```typescript
// If the spouse-to-add is identified by userId (registered user):
// 1. Find their Person
// 2. Create TreeNode in this community with their existing personId
// 3. Create Couple linking both TreeNodes
// No CrossCommunityLink created — same Person, multiple TreeNodes
```

- [ ] **Step 2: Extend add-child for cross-community couples**

When adding a child to a couple where one spouse's Person has TreeNodes in other communities:
```typescript
// After creating child Person + TreeNode + CoupleChild in this community:
// 1. Check if either spouse's Person has TreeNodes in other communities
// 2. For each other community where the spouse has a TreeNode:
//    a. Check if that spouse has a Couple in that community
//    b. If yes → create TreeNode for child in that community + CoupleChild row
// All within the same transaction
```

- [ ] **Step 3: Write tests for cross-community auto-linking**

Add to `tree.service.spec.ts`:
```typescript
describe('add-spouse (cross-community)', () => {
  it('creates TreeNode with existing personId when spouse is registered user', () => {});
  it('does not create CrossCommunityLink for registered users', () => {});
});

describe('add-child (cross-community)', () => {
  it('creates child TreeNode in both communities when spouse spans communities', () => {});
  it('creates CoupleChild in both communities', () => {});
  it('all created in single transaction', () => {});
});
```

- [ ] **Step 4: Run tests**

Run: `cd apps/api && npx jest src/tree/tree.service.spec.ts`
Expected: PASS.

---

### Task 5: Relationship Finder — Within Community (TDD)

**Files:**
- Create: `apps/api/src/relationship/relationship.service.ts`
- Create: `apps/api/src/relationship/relationship.service.spec.ts`
- Create: `apps/api/src/relationship/relationship.module.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// apps/api/src/relationship/relationship.service.spec.ts
import { Test } from '@nestjs/testing';
import { RelationshipService } from './relationship.service';
import { PrismaService } from '@family-tree/database';

describe('RelationshipService', () => {
  let service: RelationshipService;

  // Helper to build mock community data
  // Community structure:
  //   Grandpa + Grandma
  //       |
  //   Father + Mother
  //       |
  //   Child1   Child2

  describe('findRelationship (within community)', () => {
    it('finds spouse relationship (direct edge)', () => {
      // Query: Father → Mother
      // Expected path: [Father, Mother], relationship: "spouse"
    });

    it('finds parent-child relationship', () => {
      // Query: Father → Child1
      // Expected path: [Father, Child1]
    });

    it('finds grandparent relationship', () => {
      // Query: Grandpa → Child1
      // Expected path: [Grandpa, Father, Child1]
    });

    it('finds sibling relationship', () => {
      // Query: Child1 → Child2
      // Expected path: [Child1, Father (or Mother), Child2]
    });

    it('finds in-law relationship', () => {
      // Query: Grandpa → Mother
      // Expected path: [Grandpa, Father, Mother]
    });

    it('returns null when no path exists', () => {
      // Two disconnected nodes (shouldn't happen in valid tree, but defensive)
    });
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `cd apps/api && npx jest src/relationship/relationship.service.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Implement BFS relationship finder**

```typescript
// apps/api/src/relationship/relationship.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@family-tree/database';

interface GraphNode {
  treeNodeId: string;
  personId: string;
  communityId: string;
}

interface GraphEdge {
  from: string; // treeNodeId
  to: string;   // treeNodeId
  type: 'spouse' | 'parent-child';
}

@Injectable()
export class RelationshipService {
  constructor(private prisma: PrismaService) {}

  /**
   * Build undirected adjacency graph from Couples and CoupleChild within a community.
   * Edges: spouse ↔ spouse (via Couple), parent ↔ child (via CoupleChild)
   */
  private async buildCommunityGraph(communityId: string): Promise<{
    nodes: Map<string, GraphNode>;
    adjacency: Map<string, { nodeId: string; edgeType: string }[]>;
  }> {
    // 1. Fetch all TreeNodes in community
    // 2. Fetch all Couples in community → add spouse↔spouse edges
    // 3. Fetch all CoupleChild rows → add parent↔child edges (both spouses to child)
    // Return adjacency list
  }

  /**
   * BFS shortest path from nodeA to nodeB within a single community.
   */
  async findWithinCommunity(nodeAId: string, nodeBId: string): Promise<{
    path: string[]; // treeNodeIds in order
    edges: { from: string; to: string; type: string }[];
  } | null> {
    // 1. Fetch nodeA to get communityId
    // 2. Build community graph
    // 3. BFS from nodeA to nodeB
    // 4. Reconstruct path
    // Return path + edge types for labeling
  }
}
```

- [ ] **Step 4: Run tests to verify passing**

Run: `cd apps/api && npx jest src/relationship/relationship.service.spec.ts`
Expected: PASS.

---

### Task 6: Relationship Finder — Cross-Community Extension (TDD)

**Files:**
- Modify: `apps/api/src/relationship/relationship.service.ts`
- Modify: `apps/api/src/relationship/relationship.service.spec.ts`

- [ ] **Step 1: Write failing tests for cross-community**

Add to `relationship.service.spec.ts`:

```typescript
describe('findRelationship (cross-community)', () => {
  // Community X:  GrandpaX + GrandmaX → FatherX + PersonA
  // Community Y:  GrandpaY + GrandmaY → FatherY + PersonB ← PersonB's sibling = PersonC
  // PersonA married to PersonB (same Person, TreeNodes in both communities)

  it('finds cross-community relationship via shared Person', () => {
    // Query: PersonA (Community X) → PersonC (Community Y)
    // Expected: PersonA → PersonB (spouse, cross-community hop) → FatherY (parent) → PersonC (child)
  });

  it('finds cross-community relationship via explicit link (non-users)', () => {
    // Two Person records linked via CrossCommunityLink (approved)
    // BFS should traverse the link as an edge
  });

  it('does not traverse rejected or pending links', () => {
    // CrossCommunityLink with status "pending" or "rejected"
    // Should not be included in graph
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Expected: FAIL.

- [ ] **Step 3: Extend BFS for cross-community traversal**

```typescript
/**
 * Extended BFS that crosses community boundaries.
 *
 * At each TreeNode, checks:
 * 1. Does this Person have TreeNodes in other communities? (registered user)
 *    → Add edges to those TreeNodes
 * 2. Does this TreeNode have approved CrossCommunityLinks? (non-user)
 *    → Add edges to linked TreeNodes
 *
 * Lazily loads community graphs as they are reached.
 */
async findAcrossCommunities(nodeAId: string, nodeBId: string): Promise<{
  path: { treeNodeId: string; personName: string; communityId: string; communityName: string }[];
  edges: { from: string; to: string; type: 'spouse' | 'parent-child' | 'cross-community' }[];
} | null> {
  // 1. Load nodeA's community graph
  // 2. BFS with lazy community loading:
  //    - When visiting a node, check Person.treeNodes for other communities
  //    - When visiting a node, check CrossCommunityLink (approved) for linked nodes
  //    - If new community encountered, load its graph
  // 3. Continue until nodeB found or queue exhausted
  // 4. Reconstruct path with community labels
}
```

- [ ] **Step 4: Run tests to verify passing**

Expected: PASS.

---

### Task 7: Privacy Filtering on Relationship Results

**Files:**
- Modify: `apps/api/src/relationship/relationship.service.ts`

- [ ] **Step 1: Implement privacy filter**

After BFS finds the path, filter the result based on the requesting user's community memberships:

```typescript
/**
 * Filter relationship path for privacy.
 *
 * - Path nodes in communities the requesting user is a member of → full detail
 *   (name, birthYear, gender, profileId)
 * - Path nodes in communities the user is NOT a member of → name only
 */
private async filterPathForPrivacy(
  path: PathNode[],
  requestingUserId: string,
): Promise<FilteredPathNode[]> {
  // 1. Get all communityIds the requesting user belongs to (via TreeNode)
  // 2. For each path node:
  //    - If node's communityId is in user's communities → full detail
  //    - Else → { name: person.name, communityName: community.name } only
}
```

- [ ] **Step 2: Add tests for privacy filtering**

```typescript
describe('privacy filtering', () => {
  it('returns full detail for nodes in user communities', () => {});
  it('returns name only for nodes in other communities', () => {});
  it('handles path spanning 3+ communities with mixed visibility', () => {});
});
```

- [ ] **Step 3: Run tests**

Expected: PASS.

---

### Task 8: RelationshipController

**Files:**
- Create: `apps/api/src/relationship/relationship.controller.ts`

- [ ] **Step 1: Implement controller**

```typescript
// apps/api/src/relationship/relationship.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RelationshipService } from './relationship.service';

@Controller('relationship')
@UseGuards(AuthGuard)
export class RelationshipController {
  constructor(private relationshipService: RelationshipService) {}

  @Get()
  async findRelationship(
    @Query('a') nodeAId: string,
    @Query('b') nodeBId: string,
    @CurrentUser() user,
  ) {
    if (!nodeAId || !nodeBId) {
      throw new BadRequestException('Both "a" and "b" query params required');
    }

    // Determine if within-community or cross-community
    const nodeA = await this.relationshipService.getNode(nodeAId);
    const nodeB = await this.relationshipService.getNode(nodeBId);

    if (!nodeA || !nodeB) throw new NotFoundException('TreeNode not found');

    let result;
    if (nodeA.communityId === nodeB.communityId) {
      result = await this.relationshipService.findWithinCommunity(nodeAId, nodeBId);
    } else {
      result = await this.relationshipService.findAcrossCommunities(nodeAId, nodeBId);
    }

    if (!result) return { path: null, message: 'No relationship found' };

    // Apply privacy filtering
    return this.relationshipService.filterPathForPrivacy(result.path, user.id);
  }
}
```

- [ ] **Step 2: Create RelationshipModule**

```typescript
// apps/api/src/relationship/relationship.module.ts
import { Module } from '@nestjs/common';
import { RelationshipService } from './relationship.service';
import { RelationshipController } from './relationship.controller';

@Module({
  controllers: [RelationshipController],
  providers: [RelationshipService],
})
export class RelationshipModule {}
```

- [ ] **Step 3: Register both modules in AppModule**

Add `LinksModule` and `RelationshipModule` to `apps/api/src/app.module.ts` imports.

---

### Summary

| Task | What | TDD | Files |
|------|------|-----|-------|
| 1 | Link DTOs | No | 3 new |
| 2 | LinksService | Yes (7 tests) | 3 new |
| 3 | LinksController | No | 1 new |
| 4 | Cross-community auto-linking in tree ops | Yes (5 tests) | 1 modified |
| 5 | Relationship finder — within community | Yes (6 tests) | 3 new |
| 6 | Relationship finder — cross-community | Yes (3 tests) | 2 modified |
| 7 | Privacy filtering | Yes (3 tests) | 1 modified |
| 8 | RelationshipController + modules | No | 2 new, 1 modified |

**Total: ~24 tests, 13 files touched**
