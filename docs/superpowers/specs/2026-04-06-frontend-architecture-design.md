# Frontend Architecture — Design Spec

**Date:** 2026-04-06
**Status:** Draft
**Depends on:** `2026-04-04-multi-community-family-tree-design.md` (backend spec)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Code Quality & Standards](#4-code-quality--standards)
5. [Design System & Theming](#5-design-system--theming)
6. [Tree Visualization](#6-tree-visualization)
7. [Detail Panel & Node Interaction](#7-detail-panel--node-interaction)
8. [Community Creation Wizard](#8-community-creation-wizard)
9. [Auth & Routing](#9-auth--routing)
10. [Responsive Layout Shell](#10-responsive-layout-shell)
11. [State Management & API Communication](#11-state-management--api-communication)
12. [Testing Strategy](#12-testing-strategy)
13. [Component File Conventions](#13-component-file-conventions)
14. [Migration Path: Approach A → B](#14-migration-path-approach-a--b)
15. [Prototype Scope](#15-prototype-scope)

---

## 1. Overview

Two separate Angular applications sharing a UI component library:

- **`apps/web-user/`** — User-facing app: community tree view, relationship finder, wizard, profile. Talks to the API server (port 3000). Fully responsive, mobile-first.
- **`apps/web-admin/`** — Back-office admin portal: community/user/link management, audit log. Talks to the Admin server (port 3001). Desktop-focused with basic responsiveness.
- **`packages/shared-ui/`** — Shared Angular component library: person card, tree viewer, wizard, detail panel, design system tokens.

The tree is the structural backbone of the community model. Most users interact with it as a read-only visualization. Community admins perform mutations (add/edit/remove nodes) infrequently. The architecture optimizes for exploration and viewing, with admin actions available but not prominent.

### Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Angular v21 | Team expertise, NestJS pattern alignment, zoneless + signals |
| Tree rendering | Angular SVG templates + D3 for math/zoom | Reusable person-card component across app |
| State management | Signals (no NgRx) | App state is simple — user, community, tree data |
| Two apps | Separate builds for user and admin | Different auth, different backends, different audiences |
| Shared code | `packages/shared-ui` via pnpm workspace | Avoid duplication of wizard, person card, design tokens |
| Theming | CSS custom properties, system-adaptive + user override | Light/dark support via `data-theme` attribute |
| Mobile | Mobile-first responsive design | Users will access on phones; bottom sheet pattern for panels |

---

## 2. Technology Stack

### Angular v21 (latest stable, released 2026-03-27)

Key features used:

- **Standalone components** — default since v17, no NgModules
- **Signals** — reactive state primitives, replaces BehaviorSubject for component state
- **Zoneless change detection** — new default in v21. Smaller bundles, better performance, cleaner D3 integration (no Zone.js interference with D3 event handlers, no `runOutsideAngular()` workarounds)
- **Vitest** — new default test runner in v21, replaces Karma/Jasmine
- **Signal Forms** — experimental in v21. Evaluate for wizard forms; fall back to reactive forms if not production-ready

### Dependencies

| Package | Purpose |
|---------|---------|
| `@angular/core` v21 | Framework |
| `@angular/router` | Routing with lazy-loaded feature routes |
| `d3` (d3-zoom, d3-selection) | Tree zoom/pan only — no D3 DOM rendering |
| `ng-packagr` | Build `packages/shared-ui` as Angular library |

No CSS/component framework. Custom design system with CSS custom properties. Third-party component libraries added only if/when justified — keeping bundle size and dependencies minimal.

---

## 3. Project Structure

```
family-tree-v2/
├── apps/
│   ├── api/                           # Existing — NestJS user API (port 3000)
│   ├── admin/                         # Existing — NestJS admin API (port 3001)
│   ├── web-user/                      # Angular — user-facing app
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── core/              # Singleton services, guards, interceptors
│   │   │   │   │   ├── auth/          # Magic link auth, JWT interceptor, auth guard
│   │   │   │   │   ├── api/           # HTTP client services (tree, community, user, relationship)
│   │   │   │   │   ├── state/         # App state signals (community, tree, selectedNode)
│   │   │   │   │   └── layout/        # Shell component (header, community switcher, responsive)
│   │   │   │   ├── features/
│   │   │   │   │   ├── auth/          # Login, magic link verify (not lazy — needed at entry)
│   │   │   │   │   ├── tree/          # Tree view page — composes shared tree-viewer + detail panel
│   │   │   │   │   ├── wizard/        # Wraps shared wizard — injects user's Person as "me" node
│   │   │   │   │   ├── relationship/  # Relationship finder, path highlighting
│   │   │   │   │   └── profile/       # User profile edit
│   │   │   │   └── app.routes.ts      # Top-level routing with lazy imports
│   │   │   ├── styles/
│   │   │   │   └── styles.scss        # Global styles, imports shared-ui tokens
│   │   │   └── main.ts
│   │   ├── proxy.conf.json            # Dev proxy → API port 3000
│   │   └── angular.json
│   │
│   └── web-admin/                     # Angular — back-office admin app
│       ├── src/
│       │   ├── app/
│       │   │   ├── core/              # Admin auth (password + TOTP), API clients, guards
│       │   │   ├── features/
│       │   │   │   ├── auth/          # Admin login + 2FA setup
│       │   │   │   ├── dashboard/     # Platform stats
│       │   │   │   ├── communities/   # Community list + management
│       │   │   │   ├── wizard/        # Wraps shared wizard — no "me" node, admin assignment step
│       │   │   │   ├── tree/          # Tree view + admin edit (all communities)
│       │   │   │   ├── users/         # User management
│       │   │   │   ├── links/         # Cross-community link management
│       │   │   │   └── audit/         # Action log viewer
│       │   │   └── app.routes.ts
│       │   └── main.ts
│       ├── proxy.conf.json            # Dev proxy → Admin port 3001
│       └── angular.json
│
├── packages/
│   ├── database/                      # Existing — Prisma schema + client
│   └── shared-ui/                     # Shared Angular component library
│       ├── tree-viewer/               # Feature folder — tree visualization
│       │   ├── components/
│       │   │   ├── tree-viewer/       # Host — container, zoom controls, responsive
│       │   │   ├── tree-canvas/       # SVG rendering — couples, solo nodes
│       │   │   ├── person-card/       # SVG <g> — single person node (reusable)
│       │   │   └── tree-connector/    # SVG lines — spouse bars, drop lines, child bars
│       │   ├── services/
│       │   │   ├── tree-layout.service.ts      # Pure math — 4-phase algorithm
│       │   │   ├── tree-layout.service.spec.ts
│       │   │   ├── tree-zoom.service.ts        # D3 zoom/pan, exposes transform signal
│       │   │   └── tree-zoom.service.spec.ts
│       │   ├── models/
│       │   │   └── tree-layout.model.ts
│       │   └── index.ts               # Public API barrel export
│       ├── detail-panel/              # Feature folder — side panel / bottom sheet
│       │   ├── components/
│       │   │   ├── side-panel/
│       │   │   ├── bottom-sheet/
│       │   │   └── panel-content/     # Shared inner content (view, edit, add modes)
│       │   ├── services/
│       │   │   ├── panel-navigation.service.ts  # Navigation stack + back
│       │   │   └── panel-navigation.service.spec.ts
│       │   ├── models/
│       │   │   └── panel.model.ts
│       │   └── index.ts
│       ├── wizard/                    # Feature folder — community creation wizard
│       │   ├── components/
│       │   │   ├── wizard-shell/
│       │   │   ├── wizard-step-name/
│       │   │   ├── wizard-tree-builder/
│       │   │   ├── wizard-review/
│       │   │   └── wizard-node-actions/
│       │   ├── services/
│       │   │   ├── wizard-state.service.ts
│       │   │   ├── wizard-state.service.spec.ts
│       │   │   ├── wizard-layout.service.ts
│       │   │   └── wizard-layout.service.spec.ts
│       │   ├── models/
│       │   │   └── wizard.model.ts
│       │   └── index.ts
│       ├── person-card/               # Feature folder — reusable person card (HTML mode)
│       │   ├── components/            #   Distinct from tree-viewer/person-card/ (SVG mode).
│       │   │   └── person-card/       #   Both share the same Person data interface but render
│       │   └── index.ts               #   differently: HTML <div> here, SVG <g> in tree-viewer.
│       ├── styles/
│       │   ├── _tokens.scss           # Design tokens (CSS custom properties, light/dark)
│       │   ├── _breakpoints.scss      # Mobile-first responsive mixins
│       │   └── theme.scss             # Theme application + system detection
│       ├── services/
│       │   ├── theme.service.ts       # Theme toggle, localStorage, system preference
│       │   └── theme.service.spec.ts
│       ├── package.json               # @family-tree/shared-ui
│       └── ng-package.json            # ng-packagr config
│
├── eslint.config.js                   # Monorepo-wide ESLint flat config (v9 format)
├── .prettierrc                        # Prettier config
├── .stylelintrc.json                  # Stylelint config
├── .husky/                            # Git hooks
├── commitlint.config.js               # Conventional commits
├── pnpm-workspace.yaml
└── package.json
```

### Feature Folder Convention

Each feature folder in `packages/shared-ui/` contains:
- `components/` — Angular components, each in their own subfolder
- `services/` — flat structure unless complexity warrants subfolders
- `models/` — TypeScript interfaces and types
- `index.ts` — barrel export (public API)

---

## 4. Code Quality & Standards

### Tooling

| Tool | Purpose | Scope |
|------|---------|-------|
| **ESLint v9** (flat config) | TypeScript + Angular linting | All Angular apps + shared-ui |
| **angular-eslint v21** | Angular-specific rules | Angular apps + shared-ui |
| **Prettier** | Code formatting | Entire monorepo |
| **Stylelint** | SCSS/CSS linting | All SCSS files |
| **Husky** | Git hooks runner | Pre-commit, pre-push |
| **lint-staged** | Lint staged files only | Pre-commit |
| **Commitlint** | Conventional commit messages | Commit messages |

### ESLint Rules

- `@angular-eslint/recommended` — Angular best practices
- `@angular-eslint/template/recommended` — template linting, `prefer-control-flow` for `@if`/`@for`
- `@typescript-eslint/strict-type-checked` — no `any`, explicit return types on public methods
- No unused imports/variables
- Enforce standalone components (error on NgModule usage)
- Enforce signals over BehaviorSubject for component state
- Max file length ~300 lines (signal to split)

### Prettier

- Single quotes, trailing commas, 2-space indent, 100 char print width
- Applies to: TS, HTML, SCSS, JSON, MD

### Stylelint

- No hardcoded colors — must use CSS custom properties from design tokens
- No hardcoded breakpoints — must use responsive mixins from `_breakpoints.scss`
- Consistent class naming convention

### Git Hooks

**Pre-commit (Husky + lint-staged):**
- ESLint fix + Prettier on staged files only

**Pre-push:**
- Full lint + build check on affected apps

### Commit Message Format (Commitlint)

```
type(scope): description

feat(tree): add zoom-to-fit button
fix(wizard): validate community name on step 1
refactor(shared-ui): extract person-card into standalone component
docs(migration): add approach B migration guide
```

**Types:** `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `style`, `perf`

**Scopes:** `tree`, `wizard`, `relationship`, `profile`, `auth`, `shared-ui`, `admin`, `core`, `design-system`

### CI Enforcement

All of the above runs in CI as well. PRs cannot merge with lint errors, format issues, or bad commit messages. CI is additive to hooks — hooks can be bypassed locally, CI cannot.

---

## 5. Design System & Theming

### CSS Custom Properties as Single Source of Truth

Every visual value is a token. No hardcoded values — Stylelint enforces this.

### Token Structure

```scss
// packages/shared-ui/styles/_tokens.scss

:root {
  /* Surface */
  --ft-bg-primary: #ffffff;
  --ft-bg-secondary: #f5f5f7;
  --ft-bg-elevated: #ffffff;

  /* Text */
  --ft-text-primary: #1a1a1a;
  --ft-text-secondary: #6b6b6b;

  /* Gender accents (from prototype) */
  --ft-male-fill: #1e3a5f;
  --ft-male-stroke: #2a5fa0;
  --ft-male-avatar: #2a5fa0;
  --ft-female-fill: #3d1f2e;
  --ft-female-stroke: #a04a6a;
  --ft-female-avatar: #a04a6a;

  /* Interactive */
  --ft-accent: #2a5fa0;
  --ft-accent-hover: #1e4a8a;
  --ft-danger: #d94040;

  /* Borders, shadows, radii */
  --ft-border: #e0e0e0;
  --ft-radius-sm: 4px;
  --ft-radius-md: 8px;
  --ft-radius-lg: 16px;
  --ft-shadow-panel: 0 2px 12px rgba(0, 0, 0, 0.08);

  /* Spacing scale (4px base) */
  --ft-space-xs: 4px;
  --ft-space-sm: 8px;
  --ft-space-md: 16px;
  --ft-space-lg: 24px;
  --ft-space-xl: 32px;
  --ft-space-2xl: 48px;

  /* Typography */
  --ft-font-family: 'Inter', system-ui, sans-serif;
  --ft-font-size-sm: 0.75rem;
  --ft-font-size-md: 0.875rem;
  --ft-font-size-lg: 1rem;
  --ft-font-size-xl: 1.25rem;
}

[data-theme='dark'] {
  --ft-bg-primary: #0f1117;
  --ft-bg-secondary: #1a1c24;
  --ft-bg-elevated: #22242e;
  --ft-text-primary: #f0f0f0;
  --ft-text-secondary: #9a9a9a;
  --ft-border: #2e3040;
  --ft-shadow-panel: 0 2px 12px rgba(0, 0, 0, 0.3);
  /* Gender accents unchanged — work on both themes */
}
```

### Theme Service

`packages/shared-ui/services/theme.service.ts`:

- On init: check `localStorage('ft-theme')` → if set, use it. If not, read `prefers-color-scheme` media query.
- Sets `data-theme` attribute on `<html>` element.
- Exposes: `theme: Signal<'light' | 'dark' | 'system'>`
- Toggle method updates localStorage and applies immediately.
- No backend persistence — localStorage only for prototype.

### Responsive Breakpoints

```scss
// packages/shared-ui/styles/_breakpoints.scss

$breakpoints: (
  mobile: 480px,
  tablet: 768px,
  desktop: 1024px,
  wide: 1440px,
);

@mixin mobile {
  @media (max-width: 767px) { @content; }
}
@mixin tablet {
  @media (min-width: 768px) and (max-width: 1023px) { @content; }
}
@mixin desktop {
  @media (min-width: 1024px) { @content; }
}
@mixin wide {
  @media (min-width: 1440px) { @content; }
}
```

**Mobile-first:** Base styles target mobile. Use `@include desktop` / `@include tablet` to add complexity for larger screens.

---

## 6. Tree Visualization

### Architecture

Angular renders all SVG elements via templates. D3 is used only for layout math and zoom/pan behavior.

### Component Breakdown

```
packages/shared-ui/tree-viewer/
├── components/
│   ├── tree-viewer/          # Host — SVG container, zoom controls overlay, responsive sizing
│   ├── tree-canvas/          # SVG rendering — iterates couples and solo nodes
│   ├── person-card/          # SVG <g> — single person node (avatar, name, years, gender colors)
│   └── tree-connector/       # SVG lines — spouse bar, vertical drop, child bar, child drops
├── services/
│   ├── tree-layout.service   # Pure math — 4-phase algorithm (port of backend tree-layout.ts)
│   └── tree-zoom.service     # D3 zoom — attaches to SVG, exposes transform signal
└── models/
    └── tree-layout.model     # LayoutCouple, LayoutPerson, LayoutSoloNode, etc.
```

### Data Flow

1. API returns raw tree data: `{ people[], couples[] }` from `GET /communities/:id/tree`
2. `tree-layout.service` runs the 4-phase algorithm:
   - Phase 1: Generation assignment (top-down BFS from root couple)
   - Phase 2: Subtree widths (bottom-up, deepest generation first)
   - Phase 3: X/Y position assignment (top-down BFS)
   - Phase 4: Output computed positions
3. `tree-canvas` renders via Angular templates:
   - `@for (couple of layoutData.couples)` → `<svg:g>` per couple with two `<ft-person-card>` + `<ft-tree-connector>`
   - `@for (solo of layoutData.soloNodes)` → solo `<ft-person-card>`
4. D3 zoom: `tree-zoom.service` attaches `d3.zoom()` to the SVG element, exposes a `transform` signal. Top-level `<svg:g>` binds its `transform` attribute to this signal.
5. Click: Angular `(click)` on each `<ft-person-card>` emits the selected person.

### Person Card (SVG Mode)

Same visual as prototype: background rect, avatar circle (with profile photo clip or initial letter), name (1-2 line truncation), years text, gender color scheme. Renders as `<svg:g class="person">`.

The person-card component is reusable: SVG mode for the tree, HTML mode for contacts list, compact mode for inline mentions. Mode is determined by the rendering context, not an explicit input — the SVG version and HTML version are separate components sharing the same data interface.

### Zoom Controls

HTML overlay (not SVG) positioned absolutely over the tree container:
- Zoom in / Zoom out / Fit to screen buttons
- Touch: pinch-to-zoom via D3's touch zoom support
- Fit-to-screen on initial load

### Re-render Strategy

After any mutation: re-fetch `GET /communities/:id/tree` → re-run layout → Angular diffs the SVG. Zoom state preserved (D3 transform attached to persistent SVG element).

---

## 7. Detail Panel & Node Interaction

### Two Shell Components, One Content

- **Desktop (≥1024px):** `<ft-side-panel>` — slides in from right, ~360px wide, tree area shrinks
- **Mobile (<1024px):** `<ft-bottom-sheet>` — slides up from bottom with three snap points:
  - **Hidden** — no node selected
  - **Peek** — summary bar (avatar, name, birth, spouse). "Details ↑" to expand.
  - **Expanded** — ~65% of viewport, full details, scrollable. Drag handle to collapse.

Both share the same content template via content projection.

### Selection Flow

```
Click/tap person card → tree-viewer emits (nodeSelected) with Person + TreeNode
  → panel opens with person details
  → tree auto-pans (D3 zoom.translateTo) to center selected node

Click empty SVG → panel closes, deselection

Click different node while panel open → panel content updates in place (no close/reopen)
```

### Auto-Pan on Navigation

When user taps a name in the panel (spouse/parent/child link), the tree smoothly pans to center that node using D3's `zoom.translateTo()` transition, then the panel updates.

### Panel Content Modes

The panel swaps content based on the current mode:

| Mode | Content | Triggered by |
|------|---------|-------------|
| `view` | Person details: avatar, name, birth/death, spouse, parents, children (tappable), "Find Relationship To..." button. Admin actions section (visible to community admins only). | Clicking a node |
| `edit` | Edit person form: photo upload (clickable avatar → file input, preview, remove), name, birth, death, gender. Supports profile picture for non-user persons. | Admin clicks "Edit" |
| `add-child` | Add child form: name, gender, birth year | Admin clicks "Add Child" |
| `add-spouse` | Add spouse form: name, gender, birth year | Admin clicks "Add Spouse" |
| `add-sibling` | Add sibling form: name, gender, birth year | Admin clicks "Add Sibling" |
| `add-parents` | Add parents form: two stacked person forms (parent 1 + parent 2), single submit | Admin clicks "Add Parents" |

### Panel Navigation Stack

The panel maintains a navigation history:

- `panelHistory: Signal<PanelState[]>` — each action pushes onto the stack
- **Back button** visible whenever stack depth > 1, pops the stack to restore previous state
- Navigating through family links (spouse → parent → child → edit → back) all feel like natural navigation
- Stack is cleared when user clicks a new node directly in the tree (fresh context)

Example flow:
```
View Father → click "You" ↗ → View You → click "Edit" → Edit form → back → View You → back → View Father
```

### Admin Actions

Visible only when the logged-in user has community admin role. Disabled actions show tooltip explaining why:

| Action | Enabled when |
|--------|-------------|
| Edit | Always |
| Add Spouse | Person has no couple |
| Add Child | Person belongs to a couple |
| Add Sibling | Person has parents (CoupleChild row) in this community |
| Add Parents | Person is a member of the current root couple |
| Remove | Person has no couple, OR couple has no children |

---

## 8. Community Creation Wizard

### Shared Wizard (`packages/shared-ui/wizard/`)

Used by both apps with different entry logic via configuration.

### Wizard Config

```typescript
interface WizardConfig {
  selfNode?: TempNode;          // Pre-filled "me" node (user app) or undefined (admin)
  showAdminAssignment: boolean; // Extra step in admin app
  onSubmit: (data: WizardSubmission) => Observable<Community>;
}

interface TempNode {
  tempId: string;
  name: string;
  gender: 'M' | 'F';
  birthYear?: number;
  email?: string;        // Optional during tree building, required for admin assignment
  isDeceased?: boolean;
  isSelf?: boolean;
}
```

### 3-Step Flow

**Step 1 — Community Name**
- Single text input, non-empty validation
- Mobile: full-screen step view. Desktop: centered card.

**Step 2 — Build Your Family Tree**
- Interactive mini tree builder (simplified, no D3 zoom — tree small enough to fit)
- Angular renders the mini tree using the same layout algorithm at smaller scale
- Nodes are clickable → inline action menu (Add Spouse, Add Child, Add Sibling, Add Parents)
- All data is local signal state — nothing hits the API until submit
- User app: user's own node pre-created with "You" badge, cannot be removed
- Mobile: tree preview at top, action buttons at bottom, horizontal scroll for wider trees

**Step 3 — Review & Submit**
- Full tree preview (read-only)
- Community name displayed
- Admin app only: select a node to designate as community admin
  - **Constraint:** selected node must have an associated email. If no email, an inline email input appears before submit is enabled.
  - This email is needed to send a registration invite or admin role request.
- Submit → single atomic `POST /communities` transaction

**Validation:** User app requires "me" node to be connected to the tree (part of a couple or child of a couple).

### App-Specific Wrappers

```
apps/web-user/src/app/features/wizard/
└── user-wizard.component.ts     # Injects user's Person as selfNode, calls user API

apps/web-admin/src/app/features/wizard/
└── admin-wizard.component.ts    # No selfNode, adds admin assignment, calls admin API
```

---

## 9. Auth & Routing

### User App Auth (Magic Link)

```
/auth/login          → Email input → POST /auth/invite → "Check your email" screen
/auth/verify/:token  → Auto-verifies → stores JWT in memory + refresh token
                       → redirects based on community count:
                         0 communities → /wizard (onboarding)
                         1 community  → /communities/:id/tree
                         2+ communities → /communities/:defaultId/tree
```

**Token management:**
- Access token: short-lived, stored in memory (signal in AuthService). Lost on refresh — intentional.
- Refresh token: `POST /auth/refresh` on app init and before expiry. Failure → redirect to login.
- HTTP interceptor: attaches `Authorization: Bearer <token>`. On 401 → refresh → retry → if fails → logout.

### User App Routes

```
/auth/login                          # Public
/auth/verify/:token                  # Public
/wizard                              # Guarded — authenticated, no community required
/communities/:id/tree                # Guarded — authenticated + community member
/communities/:id/relationship        # Guarded — authenticated + community member
/profile                             # Guarded — authenticated
```

### User App Guards

- `authGuard` — valid session check, redirects to `/auth/login`
- `communityMemberGuard` — user belongs to `:id` community, 403 if not
- `communityAdminGuard` — not a route guard. Used in components to show/hide admin actions.

### Community Landing Logic

| Communities | Behavior |
|-------------|----------|
| 0 | Redirect to `/wizard` — first community creation as onboarding |
| 1 | Redirect to `/communities/:id/tree` — no switcher needed |
| 2+ | Redirect to default community (first joined by `createdAt`), community switcher visible in header |

### Community Switcher

- Instagram-style: community avatar/name in header, tap to see list, tap to switch
- Navigates to `/communities/:newId/tree`
- `AuthService` exposes `communities: Signal<Community[]>` and `activeCommunity: Signal<Community>`

### Admin App Auth (Password + TOTP)

```
/login               → Email + password → if 2FA enabled → TOTP code → JWT
/dashboard           # Guarded
/communities         # Guarded
/communities/:id     # Guarded — community detail + tree view
/users               # Guarded
/audit               # Guarded
```

### Admin App Guards

- `adminAuthGuard` — valid admin session
- `superAdminGuard` — for admin management routes (create/delete other admins)

---

## 10. Responsive Layout Shell

### Desktop (≥1024px)

```
┌─────────────────────────────────────────────────────┐
│ Header: [Logo] [Community ▾]          [🔍 Find] [👤] │
├──────────────────────────────────┬──────────────────┤
│                                  │   Side Panel     │
│         Tree View (SVG)          │   (~360px)       │
│         + Zoom Controls          │   Person details │
│                                  │   or edit form   │
│                                  │                  │
└──────────────────────────────────┴──────────────────┘
```

- Side panel slides in from right when node selected, tree area shrinks to accommodate
- Zoom controls: floating bottom-right of tree area

### Mobile (<768px)

```
┌──────────────────────┐
│ Header: [FT] [▾]  [👤]│
├──────────────────────┤
│                      │
│   Tree View (SVG)    │
│   + Zoom Controls    │
│                      │
├──────────────────────┤ ← Bottom sheet (peek)
│ [👤] Father  b.1965  │
│      Spouse: Mother  │
└──────────────────────┘
```

Bottom sheet states:
- **Hidden** — no selection, full tree view
- **Peek** — summary bar with avatar, name, key info. "Details ↑" to expand.
- **Expanded** — dragged up, ~65% viewport, full details + admin actions. Drag handle to collapse.

### Tablet (768px–1023px)

Same as mobile layout (bottom sheet) — side panel doesn't fit well at tablet widths.

### Header Responsive Behavior

- Desktop: full logo ("FamilyTree"), full community name, text labels
- Mobile: abbreviated logo ("FT"), truncated community name, icon-only actions

---

## 11. State Management & API Communication

### Signals-First — No Heavy Store

```
core/
├── auth/
│   └── auth.service.ts              # user: Signal<User | null>, accessToken in memory
├── api/
│   ├── api.client.ts                # Base HTTP client, JWT interceptor + refresh
│   ├── community-api.service.ts     # GET/POST /communities
│   ├── tree-api.service.ts          # GET tree, POST mutations, DELETE, PUT
│   ├── user-api.service.ts          # GET/PUT /users/me
│   └── relationship-api.service.ts  # GET /relationship
└── state/
    ├── community.state.ts           # communities: Signal<Community[]>, active: Signal<Community>
    └── tree.state.ts                # treeData: Signal<TreeResponse>, selectedNode: Signal<TreeNode | null>
```

### Mutation Data Flow

```
Admin clicks "Add Child" in panel
  → panel switches to add-child form mode
  → on submit: tree-api.service.addChild(coupleId, data)
  → on success: tree.state re-fetches GET /communities/:id/tree
  → treeData signal updates → Angular re-renders SVG
  → selectedNode stays selected (matched by person ID)
  → panel returns to view mode with updated children list
```

### Error Handling

- API errors return `{ error: "message" }` (matching backend format)
- HTTP interceptor: 401 → refresh → retry
- Component-level error signals for inline display (form validation, mutation failures)
- Toast/snackbar for success confirmations and unexpected errors
- Errors are local to the component that triggered them — no global error state

### Loading States

- Each API call has a corresponding `loading` signal in the state service
- Components show skeleton placeholders or spinners based on these signals
- Tree view: skeleton on initial load, inline spinner overlay on mutations

---

## 12. Testing Strategy

**Vitest** (Angular v21 default) for all tests.

| Layer | What's tested | Approach |
|-------|--------------|----------|
| Layout algorithm | 4-phase tree layout math | Pure unit tests — input couples/people, assert positions. No DOM. |
| Shared-ui components | Person card, detail panel, wizard steps | Component tests with Angular testing utilities. Shallow render, assert inputs/outputs/events. |
| State services | Auth, community, tree state | Unit tests — mock API responses, assert signal values. |
| API services | HTTP calls, interceptor, refresh | Unit tests with `HttpTestingController`. Assert URLs, headers, error handling. |
| Feature integration | Tree view + panel + selection | Integration tests — render with mock data, simulate click, assert panel content. |
| E2E | Full user flows | Playwright — deferred to post-prototype. |

**Not tested:** D3 zoom behavior (trust library), CSS/visual rendering (no screenshot tests for prototype).

**Test colocation:** Spec files live next to their source.

---

## 13. Component File Conventions

### Each Component Gets Its Own Folder

```
component-name/
├── component-name.component.ts
├── component-name.component.html    # Only if template > 5 lines or has complex logic
├── component-name.component.scss    # Only if component has scoped styles
└── component-name.component.spec.ts # Always present
```

### Rules

- **Template:** Inline in `.ts` (`template: '...'`) if ≤ 5 lines with no complex logic. Separate `.html` file if longer or complex.
- **Styles:** Omit `.scss` file entirely if the component has no component-scoped styles. Do not create empty style files.
- **Spec:** Always present. Every component and service is tested.

### Services (Flat Structure)

Services live flat inside `services/` folders unless complexity warrants subfolders:

```
services/
├── tree-layout.service.ts
├── tree-layout.service.spec.ts
├── tree-zoom.service.ts
└── tree-zoom.service.spec.ts
```

---

## 14. Migration Path: Approach A → B

The current architecture (Approach A) is designed for easy extraction into a library-based architecture (Approach B) when the project grows.

### Current State (Approach A)

- `packages/shared-ui/` holds shared components consumed by both apps
- Each app has its own `core/` with app-specific services (auth, API clients)
- API client services are duplicated between apps (different base URLs, different auth)

### Future State (Approach B)

When to migrate: when the admin app needs the same API client patterns, or when a third consumer (mobile web, additional app) appears.

**Step 1: Extract `packages/data-access/`**

Move from:
```
apps/web-user/src/app/core/api/     # User app API clients
apps/web-admin/src/app/core/api/    # Admin app API clients (duplicated patterns)
```

To:
```
packages/data-access/
├── tree/                            # Shared tree API client (base URL configurable)
├── community/
├── user/
└── auth/                            # Base auth client, extended per app
```

Both apps consume `@family-tree/data-access` and configure base URLs via dependency injection.

**Step 2: Split `packages/shared-ui/` if it grows large**

```
packages/
├── ui-core/           # Design tokens, theme service, breakpoints
├── ui-tree/           # Tree viewer, person card (SVG), connectors
├── ui-wizard/         # Wizard components
├── ui-panel/          # Detail panel, bottom sheet
└── data-access/       # API clients, state services
```

**Step 3: Document as you go**

Each shared-ui feature's `index.ts` barrel export defines its public API. When extracting to a separate package, the barrel export becomes the package boundary. Internal files not exported through `index.ts` are implementation details that can change freely.

### Migration Triggers

| Trigger | Action |
|---------|--------|
| Admin app needs shared API clients | Extract `packages/data-access/` |
| Third consumer app appears | Extract and version shared packages |
| `shared-ui` exceeds ~50 components | Split into focused packages |
| Team grows beyond 2-3 developers | Enforce package boundaries for code ownership |

---

## 15. Prototype Scope

### Screens to Build

| Screen | App | Description |
|--------|-----|-------------|
| Login | web-user | Email input → magic link → "check your email" |
| Verify | web-user | Auto-verify token → redirect |
| Community tree view | web-user | Full tree + side panel (desktop) / bottom sheet (mobile) |
| Community creation wizard | web-user + web-admin (shared) | 3-step: name → build tree → review + submit |
| Relationship finder | web-user | Select two people → show path with highlighting |
| User profile | web-user | Edit name, photo |
| Admin login | web-admin | Email + password + optional TOTP |
| Admin dashboard | web-admin | Platform stats |
| Admin community management | web-admin | List, view, create, edit, delete communities |
| Admin tree view | web-admin | View/edit any community's tree |
| Admin user management | web-admin | List, view, invite, edit, delete users |
| Admin audit log | web-admin | Filterable action log |

### Not in Prototype Scope

- Social feed, posts, milestones
- Event calendar
- Discussion board / chat
- Family phone book / contacts
- Shared map
- E2E tests (Playwright deferred)
- OAuth / phone OTP auth
- Push notifications
- Offline support
