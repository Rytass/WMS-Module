# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nx monorepo for a Warehouse Management System (WMS) with a NestJS GraphQL API backend, Next.js 15 frontend, and shared TypeScript libraries. Uses Yarn 4 (corepack), Node 20, PostgreSQL via TypeORM, and deploys to GKE.

## Common Commands

```bash
# Serve backend (port 7103)
yarn api

# Serve frontend (port 7101)
yarn client

# Generate GraphQL types (run after changing .gql files or resolvers)
yarn gql

# Generate Next.js path helpers
yarn pages

# Lint
npx nx lint <project>          # e.g., npx nx lint api

# Build
npx nx build api
npx nx build client
```

## Architecture

```
apps/
  api/         → NestJS + Apollo GraphQL + TypeORM (PostgreSQL)
  client/      → Next.js 15 + React 19 + Apollo Client + Mezzanine UI
libs/
  core/        → TypeORM entities, services, input types, constants
  graphql/     → Resolvers, queries, mutations, DTOs, DataLoader context
```

**Path aliases**: `@wms-module/core`, `@wms-module/graphql` (defined in `tsconfig.base.json`)

### Backend (apps/api)

- Entry: `apps/api/src/main.ts` — bootstraps on port 7103 (configurable via `PORT` env), global prefix `api`
- Built with Webpack (`webpack.config.js` at root)
- Database credentials managed via Vault (`@rytass/secret-adapter-vault-nestjs`, path: `wms-module/develop`)
- Extends `@rytass/wms-base-nestjs-module` for base WMS functionality

### Frontend (apps/client)

- Apollo Client configured in `src/apollo/index.ts` — `/graphql` proxied to backend via Next.js rewrites
- GraphQL codegen config: `src/graphql/codegen.ts` → outputs to `src/graphql/generated/.graphql.ts`
- UI component library: `@mezzanine-ui/*`
- Forms: `react-hook-form` + `yup` validation
- URL state: `nuqs`

### GraphQL Code Generation Flow

1. Backend resolvers define the schema → auto-generates `schema.gql`
2. Frontend `.gql` documents in `apps/client/src/graphql/` reference that schema
3. `yarn gql` generates typed hooks/document nodes for the client

### Key Patterns

- **DataLoader**: GraphQL context injects DataLoader instances to prevent N+1 queries
- **Domain Services**: Each domain (inventory orders, stock, transfers, batches, materials) has a dedicated service in `libs/core` and resolver in `libs/graphql`
- **Standalone Next.js**: Client uses `output: 'standalone'` for lightweight Docker images

## Environment Variables

| Variable | Used By | Default |
|---|---|---|
| `PORT` | API | 7103 |
| `API_URL` | Client | http://localhost:7103 |
| `VAULT_PATH` | API | wms-module/develop |

## Code Style

- Prettier: single quotes
- ESLint: Nx flat config with module boundary enforcement
- TypeScript: `experimentalDecorators` and `emitDecoratorMetadata` enabled (NestJS requirement), strict property initialization disabled
