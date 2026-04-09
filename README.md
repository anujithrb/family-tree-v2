# Family Tree v2

A private family social network app for building and exploring family trees. Monorepo with a NestJS API, two Angular frontends (user and admin), and a shared UI library.

## Tech Stack

- **API:** NestJS, Prisma (PostgreSQL)
- **Web User App:** Angular v21 (zoneless, signals, standalone)
- **Web Admin App:** Angular v21
- **Shared UI:** Component library (tree viewer, wizard, detail panel)
- **Testing:** Vitest
- **Package Manager:** pnpm

## Project Structure

```
apps/
  api/           — NestJS REST API
  admin/         — NestJS admin backend
  web-user/      — Angular user-facing app
  web-admin/     — Angular admin app
packages/
  database/      — Prisma schema and migrations
  shared-ui/     — Shared Angular components and services
```

## Prerequisites

- Node.js >= 24
- pnpm >= 10

## Setup

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm run db:generate

# Run database migrations
pnpm run db:migrate

# Seed the database (optional)
pnpm run db:seed
```

## Development

### Run the API server

```bash
pnpm run api
```

### Run the user web app

```bash
pnpm run web-user
```

### Run the admin web app

```bash
pnpm run web-admin
```

### Run everything together

Open separate terminals and run:

```bash
pnpm run api          # Terminal 1
pnpm run web-user     # Terminal 2
```

### API Docs (Swagger)

Once the API server is running, open [http://localhost:3000/api/docs](http://localhost:3000/api/docs) to access the Swagger UI. You can test all endpoints directly from the browser.

### Local Authentication

The app uses passwordless magic link auth. In development, the token is returned directly in the API response (in production it would be sent via email).

**Using Swagger UI (easiest):**

1. Open [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
2. Expand **Auth > POST /api/auth/invite** and click "Try it out"
3. Enter an email and display name, then execute
4. Copy the `magicLinkToken` from the response
5. Expand **Auth > GET /api/auth/verify/{token}**, paste the token, and execute
6. Copy the `accessToken` from the response
7. Click the "Authorize" button at the top, paste the access token, and all subsequent requests will be authenticated

**Using curl:**

```bash
# Step 1: Request a magic link
curl -X POST http://localhost:3000/api/auth/invite \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "displayName": "John Doe"}'

# Step 2: Verify the token (replace <token> with magicLinkToken from step 1)
curl http://localhost:3000/api/auth/verify/<token>

# Step 3: Use the access token for authenticated requests
curl http://localhost:3000/api/communities \
  -H "Authorization: Bearer <accessToken>"
```

**Using the web app:**

Navigate to `/auth/verify/<token>` in the browser and the Angular app handles token storage and routing automatically.

## Database

```bash
pnpm run db:generate   # Regenerate Prisma client after schema changes
pnpm run db:migrate    # Apply pending migrations
pnpm run db:seed       # Seed with sample data
pnpm run db:studio     # Open Prisma Studio (database GUI)
```

## Testing

```bash
pnpm run test              # Run all tests across the monorepo
pnpm run web-user:test     # Run web-user tests only
pnpm run web-admin:test    # Run web-admin tests only
pnpm run shared-ui:test    # Run shared-ui tests only
```

## Linting and Formatting

```bash
pnpm run lint          # Run ESLint
pnpm run lint:fix      # Run ESLint with auto-fix
pnpm run format        # Format code with Prettier
pnpm run format:check  # Check formatting without writing
pnpm run stylelint     # Lint SCSS files
pnpm run stylelint:fix # Fix SCSS lint issues
```

## Building

```bash
pnpm run build             # Build all packages
pnpm run web-user:build    # Build user app only
pnpm run web-admin:build   # Build admin app only
```
