# Multi-Community Family Tree — Architecture & Schema Design

**Date:** 2026-04-04
**Status:** Draft
**Prototype stack:** NestJS + PostgreSQL + Prisma (backend), lightweight frontend (vanilla JS/D3)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture: Hybrid Model](#2-architecture-hybrid-model)
3. [Data Model](#3-data-model)
4. [Authentication](#4-authentication)
5. [API Design](#5-api-design)
6. [Community Creation Wizard](#6-community-creation-wizard)
7. [Cross-Community Linking](#7-cross-community-linking)
8. [Relationship Finder](#8-relationship-finder)
9. [Deletion Logic](#9-deletion-logic)
10. [Tree Layout Algorithm](#10-tree-layout-algorithm)
11. [Project Structure](#11-project-structure)
12. [Prototype Scope](#12-prototype-scope)
13. [Future Considerations](#13-future-considerations)

---

## 1. Overview

A private social media app for families, centered around a family tree as the core data structure. Each family unit is a **community** — a single family tree with a root couple and their descendants. The app supports:

- Multiple independent communities
- Cross-community marriages where the same person appears in both trees
- Cross-community relationship finding
- User registration with self-managed profiles
- Back-office administration via a separate portal
- Community administration by designated tree members

### Key Terminology

| Term | Definition |
|------|-----------|
| **Community** | A single family tree unit — one root couple and all descendants. Equivalent to the prototype's `FamilyTree`. |
| **Person** | A global real-world identity (name, birth, death, gender). May or may not have an app account. |
| **TreeNode** | A person's position within a specific community's tree. The same Person can have TreeNodes in multiple communities. |
| **Bloodline member** | A TreeNode that has a CoupleChild row in this community (was born into this tree). Computed at render time, not stored. |
| **Married-in member** | A TreeNode that has no CoupleChild row in this community (entered through marriage). Computed at render time. |
| **Root couple** | The topmost couple in a community — neither spouse has parents in this community. Computed dynamically, never stored. |

---

## 2. Architecture: Hybrid Model

**Global Identity + Community-Local Tree Position**

The architecture separates **who a person is** (global) from **where they sit in a family tree** (community-local):

- **Global layer:** `User` (auth account) and `Person` (real-world identity) exist independently of any community.
- **Community layer:** `TreeNode` places a Person into a community's tree with a structural position (spouse, child, parent). `Couple` and `CoupleChild` are community-scoped.
- **Cross-community layer:** The same `Person` can have `TreeNodes` in multiple communities. For registered users, cross-community identity is automatic (same Person, multiple TreeNodes). For non-users, an explicit `CrossCommunityLink` connects separate Person records.

### Why this model?

- **Registered users own their profile** — one Person record, displayed consistently across all communities they belong to.
- **Communities are autonomous** — each community independently manages its tree structure (Couples, CoupleChild, TreeNode roles).
- **SpouseA/B swaps naturally** — the same real-world couple has separate Couple records in each community, with bloodline/married-in computed per community.
- **Cross-community children work** — a child of a cross-community couple gets TreeNodes in both communities, pointing to the same Person.
- **Privacy is clean** — filter at the TreeNode level (what positions are visible), not the Person level.

---

## 3. Data Model

### 3.1 Authentication & Identity Layer

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  displayName   String
  profilePhoto  String?
  status        String    @default("invited") // "invited" | "active"
  createdAt     DateTime  @default(now())
  person        Person?   @relation
  magicLinks    MagicLink[]
  sessions      Session[]
}

model MagicLink {
  id        String    @id @default(cuid())
  token     String    @unique
  userId    String
  user      User      @relation(fields: [userId], references: [id])
  expiresAt DateTime
  usedAt    DateTime?
}

model Session {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id])
  refreshToken String   @unique
  deviceInfo   String?
  expiresAt    DateTime
  createdAt    DateTime @default(now())
}
```

### 3.2 Back-Office Admin (Separate Model)

```prisma
model AdminUser {
  id           String    @id @default(cuid())
  email        String    @unique
  name         String
  passwordHash String
  otpSecret    String?
  otpEnabled   Boolean   @default(false)
  createdAt    DateTime  @default(now())
  sessions     AdminSession[]
}

model AdminSession {
  id           String   @id @default(cuid())
  adminUserId  String
  adminUser    AdminUser @relation(fields: [adminUserId], references: [id])
  refreshToken String   @unique
  deviceInfo   String?
  expiresAt    DateTime
  createdAt    DateTime @default(now())
}
```

**AdminUser is fully separated from User** — different table, different auth (password + TOTP 2FA), different sessions, different API server. No `isBackOfficeAdmin` flag on User.

### 3.3 Global Identity Layer

```prisma
model Person {
  id         String     @id @default(cuid())
  name       String     // only required field
  birthYear  Int?
  deathYear  Int?
  isDeceased Boolean    @default(false) // independent of deathYear
  gender     String?    // "M" | "F" | null
  userId     String?    @unique
  user       User?      @relation(fields: [userId], references: [id])
  treeNodes  TreeNode[]
  createdAt  DateTime   @default(now())
}
```

**Key rules:**
- `name` is the only required field. A tree can be created with just names and relationships.
- `isDeceased` is independent of `deathYear`. A person can be marked deceased without knowing the death year.
- `deathYear` present implies deceased, but not vice versa.
- If a `User` is linked, the User's `displayName` and `profilePhoto` take precedence for display.
- `deathYear` is always admin-controlled (even for registered users).

### 3.4 Community & Tree Structure Layer

```prisma
model Community {
  id        String           @id @default(cuid())
  name      String
  createdAt DateTime         @default(now())
  treeNodes TreeNode[]
  couples   Couple[]
  admins    CommunityAdmin[]
}

model CommunityAdmin {
  id          String    @id @default(cuid())
  communityId String
  community   Community @relation(fields: [communityId], references: [id])
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  role        String    // "primary" | "secondary"
  treeNodeId  String
  treeNode    TreeNode  @relation(fields: [treeNodeId], references: [id])

  @@unique([communityId, userId])
}

model TreeNode {
  id              String              @id @default(cuid())
  communityId     String
  community       Community           @relation(fields: [communityId], references: [id])
  personId        String
  person          Person              @relation(fields: [personId], references: [id])
  spouse1In       Couple?             @relation("Spouse1")
  spouse2In       Couple?             @relation("Spouse2")
  childIn         CoupleChild[]
  adminOf         CommunityAdmin?
  crossLinks      CrossCommunityLink[] @relation("LinkSideA")
  crossLinkedFrom CrossCommunityLink[] @relation("LinkSideB")

  @@unique([communityId, personId]) // one node per person per community
}

model Couple {
  id          String        @id @default(cuid())
  communityId String
  community   Community     @relation(fields: [communityId], references: [id])
  spouse1Id   String        @unique
  spouse1     TreeNode      @relation("Spouse1", fields: [spouse1Id], references: [id])
  spouse2Id   String        @unique
  spouse2     TreeNode      @relation("Spouse2", fields: [spouse2Id], references: [id])
  children    CoupleChild[]
}

model CoupleChild {
  coupleId  String
  couple    Couple   @relation(fields: [coupleId], references: [id], onDelete: Cascade)
  childId   String
  child     TreeNode @relation(fields: [childId], references: [id])
  sortOrder Int      @default(0)

  @@id([coupleId, childId])
}
```

**Key design decisions:**

- **Couple stores `spouse1` and `spouse2`** — no semantic meaning in storage. The bloodline/married-in (spouseA/spouseB) distinction is **computed at render time** based on which spouse has a CoupleChild row in this community.
- **`@@unique([communityId, personId])`** on TreeNode — one node per person per community.
- **`spouse1Id` and `spouse2Id` are `@unique`** on Couple — one couple per person per community (prototype constraint preserved).
- **CommunityAdmin links to both User and TreeNode** — the admin must be a member of the tree.
- **Root couple is computed**, never stored — the couple where neither spouse has a CoupleChild row in this community.

### 3.5 Cross-Community Layer

```prisma
model CrossCommunityLink {
  id          String                     @id @default(cuid())
  treeNodeAId String
  treeNodeA   TreeNode                   @relation("LinkSideA", fields: [treeNodeAId], references: [id])
  treeNodeBId String
  treeNodeB   TreeNode                   @relation("LinkSideB", fields: [treeNodeBId], references: [id])
  status      String                     // "pending" | "approved" | "rejected"
  createdAt   DateTime                   @default(now())
  actions     CrossCommunityLinkAction[]

  @@unique([treeNodeAId, treeNodeBId])
}

model CrossCommunityLinkAction {
  id        String   @id @default(cuid())
  linkId    String
  link      CrossCommunityLink @relation(fields: [linkId], references: [id])
  action    String   // "requested" | "approved" | "rejected"
  actorType String   // "user" | "admin"
  actorId   String   // userId or adminUserId
  createdAt DateTime @default(now())
}
```

**CrossCommunityLink is only needed for non-users.** For registered users, cross-community identity is automatic — the same Person has TreeNodes in multiple communities via `personId`.

**Application-level constraint:** Both TreeNodes in a link must be in **different communities**. The link asserts that these two tree positions represent the same real-world person.

**Back-office admin** can create links with `status: "approved"` directly, bypassing the request/approval flow. All actions are logged via `CrossCommunityLinkAction`.

### 3.6 Bloodline/Married-In Computation

Not stored in the database. Computed at render time:

```
function computeBloodlineStatus(couple, communityId):
  spouse1HasParents = CoupleChild.exists(childId = couple.spouse1Id, in this community)
  spouse2HasParents = CoupleChild.exists(childId = couple.spouse2Id, in this community)

  if spouse1HasParents and not spouse2HasParents:
    spouseA = spouse1  (bloodline)
    spouseB = spouse2  (married-in)
  else if spouse2HasParents and not spouse1HasParents:
    spouseA = spouse2  (bloodline)
    spouseB = spouse1  (married-in)
  else:
    // Root couple — neither has parents. Use storage order.
    spouseA = spouse1
    spouseB = spouse2
```

This eliminates the need for reassignment when parents are added above a node. The bloodline status shifts automatically.

---

## 4. Authentication

### 4.1 App Users — Magic Link (Invite-Only)

**Registration flow:**
1. Back-office admin or community admin sends invite (email)
2. System creates `User` (status: `invited`) + `MagicLink` (token, expiry)
3. Email sent with verification link
4. User clicks link → system verifies token → activates User → creates `Session` (long-lived refresh token)
5. User is logged in — this is a **one-time-per-device event**

**Subsequent logins (new device):**
1. User enters email → system sends new magic link
2. User clicks → new Session created for this device

**Session management:**
- **Refresh token:** Long-lived (configurable, e.g., 6 months), stored per device
- **Access token:** Short-lived JWT (e.g., 15 minutes), generated from refresh token
- **Silent refresh:** Client uses refresh token to get new access token before expiry
- User never sees login again on the same device until refresh token expires

**Auth extensibility:** The `User` model has no password field. Future auth methods add their own tables:

```
OAuthAccount { userId, provider, providerAccountId }  // future
PhoneAuth { userId, phoneNumber, verified }            // future
```

### 4.2 Back-Office Admin — Password + TOTP 2FA

**Login flow:**
1. Admin enters email + password
2. System verifies credentials
3. If 2FA enabled → prompt for 6-digit TOTP code
4. System verifies OTP against `otpSecret`
5. `AdminSession` created → logged in

**2FA setup:**
1. Admin goes to security settings → "Enable 2FA"
2. System generates `otpSecret` → shows QR code
3. Admin scans with authenticator app (Google Authenticator, Authy, etc.)
4. Admin enters verification code to confirm
5. `otpEnabled = true`, `otpSecret` saved

TOTP follows RFC 6238. Works with any standard authenticator app.

---

## 5. API Design

### 5.1 Two Separate NestJS Applications

| App | Port | Purpose | Auth |
|-----|------|---------|------|
| **API Server** | 3000 | User-facing — communities, trees, relationships | User JWT (via magic link) |
| **Admin Server** | 3001 | Back-office — platform management | AdminUser JWT (password + 2FA) |

### 5.2 API Server Endpoints

**Auth:**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/auth/invite` | Send magic link invite |
| GET | `/auth/verify/:token` | Verify magic link, create session |
| POST | `/auth/refresh` | Refresh access token |

**Users:**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/users/me` | Get own profile |
| PUT | `/users/me` | Update own profile (name, photo) |

**Communities:**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/communities` | List communities the user belongs to |
| POST | `/communities` | Create community (wizard — atomic transaction) |
| GET | `/communities/:id` | Get community details |

**Tree operations (all scoped to community):**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/communities/:id/tree` | Full tree fetch |
| POST | `/communities/:id/tree/add-spouse` | Add spouse to existing node → creates Person + TreeNode + Couple |
| POST | `/communities/:id/tree/add-child` | Add child to a couple → creates Person + TreeNode + CoupleChild |
| POST | `/communities/:id/tree/add-parents` | Add parents above a root couple member → creates 2 Persons + 2 TreeNodes + Couple + CoupleChild |
| POST | `/communities/:id/tree/add-sibling` | Add sibling (child of same parents) → creates Person + TreeNode + CoupleChild. **Requires:** target node must have parents (a CoupleChild row) in this community. |
| PUT | `/communities/:id/tree/nodes/:nodeId` | Edit node (delegates to Person if user-owned) |
| DELETE | `/communities/:id/tree/nodes/:nodeId` | Remove node (asymmetric deletion) |

**Cross-community links (non-users only):**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/links/request` | Request a cross-community link |
| PUT | `/links/:id/approve` | Approve a pending link |
| PUT | `/links/:id/reject` | Reject a pending link |
| GET | `/links/pending` | List pending link requests for admin |

**Relationship finder:**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/relationship?a=nodeId&b=nodeId` | Find shortest path (within + cross-community) |

### 5.3 Admin Server Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/admin/auth/login` | Password + 2FA login |
| POST | `/admin/auth/refresh` | Refresh admin session |
| GET | `/admin/communities` | List all communities |
| POST | `/admin/communities` | Create community (assign admin from nodes) |
| DELETE | `/admin/communities/:id` | Delete community |
| PUT | `/admin/communities/:id/admins` | Assign/remove community admins |
| GET | `/admin/users` | List all users |
| POST | `/admin/users/invite` | Send user invite |
| PUT | `/admin/users/:id` | Update/deactivate user |
| POST | `/admin/links` | Create approved link directly |
| PUT | `/admin/links/:id` | Override link status |
| GET | `/admin/audit` | View action logs |

### 5.4 Key API Behaviors

- **Community scoping:** All tree operations are scoped to `communityId` in the URL path. Auth middleware validates community membership before hitting the controller.
- **TreeNode's community is inherited from the URL** — not from the request body. Prevents cross-community injection.
- **No orphan nodes:** Person creation is always bundled with tree position (spouse, child, parent, sibling) in a single transaction.
- **Cross-community children:** When adding a child to a couple where one spouse is a registered user with TreeNodes in another community, the child's TreeNode is automatically created in both communities within the same transaction.
- **`add-parents` constraint:** Only available on members of the current root couple (couple where neither spouse has parents in this community).

---

## 6. Community Creation Wizard

### 6.1 Path A: Community Admin (Self-Service)

A logged-in user creates a community and places themselves in the tree.

**Step 1 — Community Name**
- Input: community name
- Validation: non-empty

**Step 2 — Build Your Family Tree**
- The user's own node is pre-created from their User account (name, photo)
- Displayed with a "You" badge — cannot be removed
- Available actions from any node:
  - **Add spouse** — creates a partner node, forming a couple
  - **Add child** — available once the node has a spouse (couple exists)
  - **Add sibling** — adds a child to the same parents (available only after parents exist)
  - **Add parents** — creates a couple above (only available on root couple members)
- Every action keeps the tree connected — no orphans by construction
- Live preview updates as nodes are added

**Step 3 — Review & Submit**
- Full tree preview
- Confirm community name
- Submit → single atomic transaction

**Validation before submit:** The user's "me" node must be connected to the tree (part of a couple or child of a couple).

### 6.2 Path B: Back-Office Admin

**Step 1 — Community Name**

**Step 2 — Build the Family Tree**
- Same free-form builder but no pre-filled "me" node
- Back-office admin builds the tree with names

**Step 3 — Assign Community Admin**
- Select one tree node to designate as community admin
- If that person is a registered user → send request to accept admin role
- If not registered → send registration invite with admin role

**Key difference:** Back-office admin is NOT placed in the tree. Community admin IS placed in the tree.

### 6.3 Wizard API

```
POST /communities
```

```json
{
  "name": "The Rajan Family",
  "nodes": [
    { "tempId": "t1", "name": "Grandpa", "gender": "M", "birthYear": 1940, "isDeceased": true },
    { "tempId": "t2", "name": "Grandma", "gender": "F" },
    { "tempId": "t3", "name": "Father", "gender": "M", "birthYear": 1965 },
    { "tempId": "t4", "name": "Mother", "gender": "F", "birthYear": 1968 },
    { "tempId": "t5", "name": "Me", "gender": "M", "birthYear": 1990, "isSelf": true }
  ],
  "couples": [
    { "spouse1": "t1", "spouse2": "t2" },
    { "spouse1": "t3", "spouse2": "t4" }
  ],
  "children": [
    { "coupleSpouse1": "t1", "coupleSpouse2": "t2", "childRef": "t3", "sortOrder": 0 },  // tempId references
    { "coupleSpouse1": "t3", "coupleSpouse2": "t4", "childRef": "t5", "sortOrder": 0 }   // couple identified by spouse tempIds
  ]
}
```

**Backend transaction:**
1. Create Community
2. Create all Persons + TreeNodes (resolving tempIds)
3. Create all Couples
4. Create all CoupleChild rows
5. Link the `isSelf` node to the logged-in User's Person
6. Create CommunityAdmin record (primary) for the user

All atomic — if anything fails, everything rolls back.

---

## 7. Cross-Community Linking

### 7.1 Two Mechanisms

**Registered users (automatic):**
- A registered User has a Person, which can have TreeNodes in multiple communities
- When User B (member of Community Y) is added as a spouse in Community X, a new TreeNode is created in Community X pointing to the **same Person**
- Cross-community identity is implicit — no explicit link needed
- The relationship finder traverses via `Person → all TreeNodes`

**Non-users (explicit link):**
- Two separate Person records exist in different communities for the same real-world individual
- A community admin initiates a `CrossCommunityLink` request
- The other community's admin approves
- The link enables cross-community relationship finding through these nodes

### 7.2 Link Lifecycle

1. **Request:** Community admin identifies a non-user person in their tree who exists in another community. Initiates link request.
2. **Pending:** `CrossCommunityLink` created with status `pending`. Action logged.
3. **Approval:** Other community's admin reviews and approves. Action logged.
4. **Active:** Link status becomes `approved`. Relationship finder can now traverse this link.

**Back-office admin** can create links with `status: approved` directly, bypassing the approval flow. All actions logged via `CrossCommunityLinkAction`.

### 7.3 Cross-Community Children

When a child is added to a couple that spans two communities (one spouse has TreeNodes in both):
- A TreeNode for the child is created in **both communities** automatically
- Both TreeNodes point to the same Person
- The child is a `bloodline` member in both communities
- Each community's CoupleChild record points to its own community-local Couple

---

## 8. Relationship Finder

### 8.1 Within a Single Community

Same BFS as the prototype:
1. Build undirected adjacency graph from Couples and CoupleChild within the community
2. Edges: spouse ↔ spouse (via Couple), parent ↔ child (via CoupleChild)
3. BFS from node A to node B
4. Return path + relevant people and couples for rendering

### 8.2 Cross-Community

The graph extends beyond one community:

1. Given two TreeNodes (nodeA in Community X, nodeB in Community Y)
2. Build adjacency graph starting from nodeA's community
3. At each TreeNode, check if the underlying Person has TreeNodes in other communities
4. If yes, add edges to those TreeNodes (cross-community hop)
5. Continue BFS until nodeB is reached

**Example:**
```
Community X:  GrandpaX → FatherX → PersonA
                                      |
                                married to PersonB
                                      |
Community Y:  GrandpaY → FatherY → PersonB
                              |
                           PersonC (sibling of PersonB)
```

**Query:** How is PersonA related to PersonC?
**Path:** PersonA → PersonB (spouse, cross-community hop) → FatherY (parent) → PersonC (child)

### 8.3 Privacy Filtering on Results

- Path nodes in communities the requesting user is a member of → full detail
- Path nodes in communities the user is NOT a member of → name only (or filtered per community privacy settings, when implemented)

---

## 9. Deletion Logic

### 9.1 Deletion Cases

Bloodline/married-in is computed at deletion time using the same render-time logic (has CoupleChild row = bloodline).

| Case | Behavior |
|------|----------|
| Node has no couple | Delete TreeNode. If Person has no other TreeNodes and no User, delete Person too. |
| Node is married-in (no CoupleChild row) | Delete TreeNode + dissolve Couple. Bloodline spouse's TreeNode stays. |
| Node is bloodline (has CoupleChild row) | Delete TreeNode + married-in spouse's TreeNode + dissolve Couple. |
| Node's couple has children | **Reject with 409** — must remove descendants first. |

### 9.2 Cross-Community Impact

| Scenario | Behavior |
|----------|----------|
| Deleted node's Person has TreeNodes in other communities | Other communities are **unaffected**. Only the local TreeNode is removed. |
| Deleted node was part of a cross-community couple | This community's Couple is dissolved. The other community's Couple is **unaffected** (separate record). |
| Deleted node's Person is a registered User | User and Person records are **never deleted** via tree operations. Only TreeNode is removed. |

### 9.3 Transaction Order

1. Find TreeNode (404 if missing)
2. Find Couple if any
3. If couple has CoupleChild rows → return 409
4. Compute bloodline/married-in for both spouses
5. If target is bloodline → also mark married-in spouse's TreeNode for deletion
6. Delete CoupleChild row where child = target node (remove from parent's children)
7. Delete Couple row (cascades its CoupleChild rows)
8. Delete marked TreeNode(s)
9. For each deleted TreeNode: if Person has no remaining TreeNodes and no User → delete Person

---

## 10. Tree Layout Algorithm

The prototype's 4-phase layout algorithm is preserved with adaptations for the new model.

### 10.1 Adaptation from Prototype

The algorithm operates on TreeNodes (not Persons) and Couples within a single community. Cross-community data is not rendered in the tree view — only the local community's tree is visualized.

**Phase 1 — Generation Assignment:** BFS from root couple (computed dynamically). Unchanged.

**Phase 2 — Subtree Widths:** Bottom-up computation. Unchanged.

**Phase 3 — X/Y Positions:** Top-down BFS positioning. Unchanged.

**Phase 4 — Render:** Two adaptations:
- **SpouseA/B is computed**, not stored. The render phase calls `computeBloodlineStatus()` for each couple to determine which spouse renders on the left (spouseA/bloodline) vs right (spouseB/married-in).
- **Connector drop targets** use the computed spouseA position (`spouseAX + NODE_W/2`), not `couple.cx`.

### 10.2 `add-parents` and Root Shifting

When `add-parents` is called on a root couple member:
- New parents become the root couple
- Previous root member now has a CoupleChild row → becomes bloodline
- Their spouse (no CoupleChild row) → becomes married-in
- The layout algorithm picks up the new root automatically (couple with no parents)

### 10.3 Layout Constants (Reference)

From the prototype — will likely change for the new design:

| Constant | Value | Meaning |
|----------|-------|---------|
| NODE_W | 120px | Person card width |
| NODE_H | 60px | Person card height |
| SPOUSE_GAP | 12px | Gap between spouse cards |
| SUBTREE_GAP | 48px | Gap between sibling subtrees |
| ROW_HEIGHT | 120px | Vertical distance between generations |
| PADDING | 40px | Canvas padding |

---

## 11. Project Structure

### 11.1 pnpm Monorepo

```
family-tree-v2/
├── apps/
│   ├── api/                        # NestJS — User-facing API (port 3000)
│   │   ├── src/
│   │   │   ├── auth/               # Magic link, sessions, JWT guards
│   │   │   ├── users/              # Self-managed profile
│   │   │   ├── communities/        # Community CRUD + wizard creation
│   │   │   ├── tree/               # Tree operations (add-spouse/child/parents/sibling, remove, edit)
│   │   │   │   ├── tree.controller.ts
│   │   │   │   ├── tree.service.ts
│   │   │   │   ├── tree-layout.service.ts   # 4-phase layout (pure math)
│   │   │   │   ├── tree.guard.ts            # Community membership validation
│   │   │   │   └── dto/
│   │   │   ├── links/              # CrossCommunityLink request/approve
│   │   │   ├── relationship/       # BFS finder (within + cross-community)
│   │   │   └── common/             # Guards, interceptors, filters
│   │   └── main.ts
│   │
│   ├── admin/                      # NestJS — Back-office admin API (port 3001)
│   │   ├── src/
│   │   │   ├── admin-auth/         # Password + TOTP 2FA
│   │   │   ├── admin-communities/  # Full community management
│   │   │   ├── admin-users/        # User management, invites
│   │   │   ├── admin-links/        # Override cross-community links
│   │   │   ├── admin-audit/        # Action log viewer
│   │   │   └── common/
│   │   └── main.ts
│   │
│   └── web/                        # Lightweight frontend
│       ├── public/
│       ├── index.html              # Community tree view
│       ├── admin.html              # Back-office admin portal
│       └── ...
│
├── packages/
│   └── database/                   # Shared Prisma schema + client
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── migrations/
│       ├── seed.ts
│       └── index.ts
│
├── pnpm-workspace.yaml
└── package.json
```

### 11.2 Why pnpm Monorepo?

- **Shared Prisma schema:** Both `api` and `admin` apps use the same database via `@family-tree/database`
- **Single migration path:** One source of truth for DB state
- **Independent deployment:** Each app builds and deploys separately
- **Strict dependencies:** pnpm prevents phantom dependency access
- **Disk/speed:** Content-addressable store, 2-3x faster installs than npm

---

## 12. Prototype Scope

### 12.1 Must-Haves

| Feature | Description |
|---------|-------------|
| Multi-community CRUD | Create, read, update, delete communities |
| Cross-community marriage linking | Explicit linking for non-users; automatic for registered users |
| Cross-community children | Children of cross-community couples appear in both trees |
| Deceased flag | Independent of death year |
| Free-form tree builder wizard | Build tree from "me" node in any direction |
| Back-office admin portal | Separate NestJS app with password + 2FA |
| Relationship finder (within community) | BFS shortest path |
| Relationship finder (cross-community) | BFS traversing cross-community hops |
| User registration + self-managed profile | Magic link invite, own name/photo |

### 12.2 Nice-to-Haves (Designed For, Not Implemented)

| Feature | Notes |
|---------|-------|
| Multiple marriages | Remove `@unique` on Couple spouse fields; add marriage status/dates |
| Multiple root couples (forest layout) | Layout algorithm handles N root couples connected via marriages |
| Privacy controls (community-level) | Community admin sets visibility defaults for outsiders |
| Privacy controls (per-person) | Admin overrides defaults for specific linked individuals |
| Primary + secondary admin roles | Multiple primary admins allowed, at least one required; secondary with restricted privileges |

---

## 13. Future Considerations

### 13.1 Auth Extensibility

Magic link is prototype-only. The User model supports future auth methods via separate tables:
- **OAuth:** `OAuthAccount { userId, provider, providerAccountId }`
- **Phone OTP:** `PhoneAuth { userId, phoneNumber, verified }`
- **Password:** `PasswordAuth { userId, passwordHash }` (if ever needed)

### 13.2 Deployment

The monorepo structure maps directly to containerized deployment:

```
docker-compose.yml (future)
├── api         → apps/api (port 3000)
├── admin       → apps/admin (port 3001)
├── web         → apps/web (nginx, port 80)
├── postgres    → database (port 5432)
└── mailhog     → email testing (dev only)
```

Kubernetes for auto-scaling, multi-region, and zero-downtime deployments when needed.

### 13.3 Data Model Extensions

- `marriageDate` / `divorceDate` / `marriageStatus` on Couple (for multiple marriages)
- `relationshipType` on CoupleChild (for adoption/step-parent modeling)
- Gender field expansion beyond "M"/"F"
- User-level privacy controls (users decide what personal data to share)
- Data request mechanism (request phone/email from cross-community members)
- Birth order editing (reorder siblings by sortOrder)

### 13.4 Performance

- `GET /communities/:id/tree` returns the full tree — won't scale to large communities. Consider paginated/lazy fetch by generation.
- Cross-community relationship finder may traverse many communities. Consider depth limits or caching.
- File storage: move from local disk to S3/GCS for multi-instance deployments.
