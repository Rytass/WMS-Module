# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nx monorepo for a Warehouse Management System (WMS) with a NestJS GraphQL API backend, Next.js 15 frontend, and three publishable TypeScript libraries (`@rytass/wms-module-{core,graphql,react}`). Uses Yarn 4 (corepack), Node 20, PostgreSQL via TypeORM, deploys to GKE, and releases via Nx Release.

## Common Commands

```bash
# Serve backend (port 7103)
yarn api

# Serve frontend (port 7101)
yarn client

# Generate typed GraphQL hooks/document nodes
#   - reads .gql operations from libs/react/src/graphql
#   - writes libs/react/src/graphql/generated/.graphql.ts (committed)
yarn gql

# Regenerate libs/react/src/utils/nextpath.ts from apps/client/src/pages structure
yarn pages

# Lint
npx nx lint <project>          # e.g., npx nx lint api

# Build
npx nx build <project>         # core, graphql, react, api, client
npx nx run-many -t build --projects=core,graphql,react,api,client

# Release (publishable libs only)
yarn release                   # bumps + tags + pushes via Nx Release
yarn release:publish           # CI normally runs this on tag push
```

See `RELEASING.md` for the full release flow including the chicken-and-egg first publish.

## Architecture

```
apps/
  api/        → NestJS + Apollo GraphQL + TypeORM (PostgreSQL)
  client/     → Next.js 15 Pages Router — thin shells only, real UI is in libs/react

libs/
  core/       → @rytass/wms-module-core    — TypeORM entities, services, input types, constants
  graphql/    → @rytass/wms-module-graphql — Resolvers, queries, mutations, DTOs, DataLoader context
  react/      → @rytass/wms-module-react   — React UI components, hooks, Apollo client factory, GraphQL ops
```

**TS path aliases** (`tsconfig.base.json`) — `@rytass/wms-module-*` is the canonical form; the legacy `@wms-module/*` aliases still resolve for back-compat but **new code must use `@rytass/wms-module-*`** because that name matches what consumers see after `npm install`.

### Backend (apps/api)

- Entry: `apps/api/src/main.ts` — bootstraps on port 7103 (configurable via `PORT` env), global prefix `api`
- Built with Webpack (`apps/api/webpack.config.js`)
- Database credentials managed via Vault (`@rytass/secret-adapter-vault-nestjs`, path: `wms-module/develop`)
- Extends `@rytass/wms-base-nestjs-module` for base WMS functionality
- Imports `WmsModuleGraphqlModule.forRootAsync(...)` from `@rytass/wms-module-graphql`

### Frontend (apps/client)

`apps/client/src/` is **shell-only** after the lib extraction. It contains exactly three things:

- `pages/*/index.tsx` — 3-13 line Pages-Router shells that import a default page component from `@rytass/wms-module-react`. New routes follow this exact pattern.
- `pages/_app.tsx` — Apollo Provider + Mezzanine `CalendarConfigProviderDayjs` + `NuqsAdapter` + provider stack (`DialogProvider`, `InventoryActionsProvider`, `ModalProvider` from the lib) wrapping `AuthGuard`.
- `auth/` — app-specific session handling (`AuthGuard.tsx`, `AuthorizedAdminPage/`).
- `styles/` — global SCSS (mezzanine.scss, global.scss).

**Real frontend work happens in `libs/react/src/`** — components, hooks, Apollo factory, GraphQL operations all live there. Resist the reflex to add new logic under `apps/client/src/`; it only belongs there if it's the Next.js shell, the AuthGuard, or app-global styles.

### Library Publishing & Conventions

The three `libs/*` packages publish to npm via Nx Release (independent semver, tag pattern `{projectName}@{version}`). Their structure imposes several non-obvious rules:

#### `libs/*` are intentionally NOT yarn workspaces

Root `package.json` `workspaces` lists only `packages/*` and `apps/*`. If you add `libs/*` back, yarn will create `node_modules/@rytass/wms-module-*` symlinks, `webpack-node-externals` (used by `NxAppWebpackPlugin` with `generatePackageJson: true`) will mark our libs as external for `apps/api`'s build, and the generated `dist/apps/api/package.json` will omit them as deps — the staging Docker image will then fail `yarn install` at deploy time because the packages do not exist on npm yet. Nx Release discovers projects through the Nx project graph independently of yarn workspaces, so removing them costs us nothing. **Never add `libs/*` back to `workspaces`.**

#### Adding a new publishable lib

Touch all of these or the publish pipeline silently misbehaves:

1. `libs/<name>/package.json` — `name: "@rytass/wms-module-<name>"`, `peerDependencies` listed individually, `files` allowlist
2. `libs/<name>/tsconfig.json` and `tsconfig.lib.json` — `outDir: "."`, `rootDir: "./src"`, `noEmitOnError: false`
3. `libs/<name>/rollup.config.mjs` — `@rollup/plugin-typescript`; mark every peer dep and node builtin as `external`
4. `libs/<name>/project.json` — `build` target invokes Rollup, `clean` target wipes emitted paths
5. `tsconfig.base.json` `paths` — add `"@rytass/wms-module-<name>": ["libs/<name>/src/index.ts"]` for the dev loop
6. `nx.json` `release.projects` — add `"<name>"`
7. `.github/workflows/publish.yml` `on.push.tags` — add `<name>@*`
8. `.gitignore` — exclude the per-file build artefacts (`libs/<name>/<emit-dirs>`) so a local build does not pollute git status

#### Module return types must be explicit

`forRoot` / `forRootAsync` on `WmsModuleCoreModule` and `WmsModuleGraphqlModule` must declare a `: DynamicModule` return annotation. Without it, tsc infers a structural return type from the object literal, walks into internal classes like `ModelsModule`, and writes `typeof import("../../../core/lib/models/models.module")` into the published `.d.ts`. Those relative paths are nonsense once installed from npm. Always add the annotation when introducing new `forRoot`-style factories.

#### DTO and entity nullability must match

GraphQL DTOs in `libs/graphql/src/lib/dto/*.dto.ts` are returned from services that hand back the TypeORM entity. If the entity column is `string | null`, the DTO field must also declare `string | null` plus `@Field(() => String, { nullable: true })`. Mismatches trigger TS2322 (we suppress it in build via `noEmitOnError: false`, so the build still succeeds but the published `.d.ts` lies about the contract). Check both sides whenever you add or modify a nullable column.

#### Rollup externals must track peer deps

Each `libs/*/rollup.config.mjs` keeps an `externalPatterns` array. When you add a peer dependency to a lib's `package.json` you must also add the package name (and any sub-path regex like `/^lodash\//`) to that array, otherwise Rollup will bundle the dep into our output — bloating the package and locking consumers to one specific version. The dependencies are not auto-synced.

#### `apps/api` webpack alias for source-resolution

`apps/api` consumes `@rytass/wms-module-{core,graphql}` through the `tsconfig.base.json` path aliases — webpack resolves to source files and bundles them. This is intentional: it keeps the api Docker image free of any unpublished npm dependency. **Do not add `libs/*` to the api's webpack `externals`** or revert the path-alias resolution.

#### `libs/react` is ESM-only

`libs/react/package.json` declares `"type": "module"` because `nuqs` (used by `PageTabs` and `useTablePagination`) is ESM-only and cannot be `require()`-d from a CJS bundle. Consumers target Next.js / Vite / webpack 5 which handle ESM natively. There is a known SSR runtime issue when an external consumer `npm install`s the lib because `@mezzanine-ui/react` ships ESM-syntax JS without the `"type": "module"` flag and imports `lodash/compact` without a `.js` extension. The Rytass internal monorepo escapes this because `apps/client` consumes the lib through a `tsconfig` path alias to source. See `libs/react/README.md` "Known issues" for the workarounds.

#### Route constants are hard-coded

`libs/react/src/utils/nextpath.ts` is generated by `yarn pages` from the `apps/client/src/pages` tree. The `NextPath` enum and `useRoutes()` hook are consumed by lib components and re-exported. **Changing existing enum values is a breaking change** for downstream consumers: their routes will no longer match. Add new values freely (they bump a minor) but never rename or remove existing ones without a major bump.

### GraphQL Code Generation Flow

1. Backend resolvers in `libs/graphql/src/` define the schema → NestJS' `autoSchemaFile` writes `schema.gql` at the repo root (committed).
2. `.gql` documents in `libs/react/src/graphql/{fragments,queries,mutations}` reference that schema.
3. `yarn gql` (= `nx run react:graphql`) reads `libs/react/src/graphql/codegen.ts` and writes `libs/react/src/graphql/generated/.graphql.ts`.

**The generated file MUST be committed.** Despite its `.graphql.ts` name, it is not in `.gitignore` — `npm install @rytass/wms-module-react` ships it as part of the package so consumers do not need to run codegen themselves. If you ever see it as untracked or modified after `yarn gql`, commit it. Re-run `yarn gql` whenever you change `.gql` files or backend resolver signatures.

### Key Patterns

- **DataLoader**: GraphQL context injects DataLoader instances to prevent N+1 queries (`libs/graphql/src/lib/helpers`)
- **Domain Services**: Each domain (inventory orders, stock, transfers, batches, materials, quality inspection) has a dedicated service in `libs/core` and resolver in `libs/graphql`
- **Standalone Next.js**: Client uses `output: 'standalone'` for lightweight Docker images
- **Entity-as-ObjectType**: TypeORM entities double as GraphQL ObjectTypes via `@ObjectType()` decorators in `libs/core`

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
