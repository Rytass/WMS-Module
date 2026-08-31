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

# Release (publishable libs only) — publishing is fully manual (no CI publish workflow)
yarn release                        # bump + tag + push (nx release --skip-publish); no auto-publish
yarn release:publish --otp=NNNNNN   # publish to npm — run locally; npm 2FA OTP required
```

See `RELEASING.md` for the full manual release flow. The automated `.github/workflows/publish.yml` was removed in PR #177 (it kept producing inconsistent provenance attestations on the self-hosted runner); the maintainer now runs both phases locally from a clean `main`.

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
- `pages/_app.tsx` — Apollo Provider + Mezzanine `CalendarConfigProviderDayjs` + `NuqsAdapter` wrapping `AuthGuard`. The lib-level `DialogProvider` / `InventoryActionsProvider` / `ModalProvider` stack is **not** here — it lives in `auth/AuthorizedAdminPage/`, around the authorized page content.
- `auth/` — app-specific session handling: `AuthGuard.tsx` (session gate) and `AuthorizedAdminPage/` (wraps the authorized page in the lib's `InventoryActionsProvider` → `DialogProvider` → `ModalProvider` stack).
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
6. `nx.json` `release.projects` — add `"<name>"` (Nx Release uses the global tag pattern `{projectName}@{version}`, so there is no per-lib tag config)
7. `.gitignore` — exclude the per-file build artefacts (`libs/<name>/<emit-dirs>`) so a local build does not pollute git status

(There is **no** publish CI workflow to touch — publishing is manual via `yarn release` + `yarn release:publish`; the old `.github/workflows/publish.yml` was removed in PR #177. See `RELEASING.md`.)

#### Module return types must be explicit

`forRoot` / `forRootAsync` on `WmsModuleCoreModule` and `WmsModuleGraphqlModule` must declare a `: DynamicModule` return annotation. Without it, tsc infers a structural return type from the object literal, walks into internal classes like `ModelsModule`, and writes `typeof import("../../../core/lib/models/models.module")` into the published `.d.ts`. Those relative paths are nonsense once installed from npm. Always add the annotation when introducing new `forRoot`-style factories.

#### Every new Query/Mutation needs `@WmsOperation`

Resolver authorization is opt-in and host-neutral (`libs/graphql/src/lib/auth`). Each root `@Query` / `@Mutation` carries `@WmsOperation({ resource, action })`, which (1) stores a permission requirement for `WmsAuthGuard` to hand to the consumer's `authChecker`, and (2) stamps a host-skip marker (`HOST_SKIP_METADATA_KEY`, default = member-base's `IS_ROUTE_PUBLIC`) so a consumer's global `APP_GUARD` (e.g. member-base's deny-by-default `CasbinGuard`) defers instead of rejecting every WMS field. **A bare `@Query`/`@Mutation` re-introduces the "all WMS operations forbidden" bug** for consumers running a global guard — always add `@WmsOperation`. Do **not** add it to `@ResolveField` (those are reached only through an already-authorized root op). Convention: `resource` = kebab domain, `action` = `'read'` for queries / leading verb for mutations. These strings are internal metadata (not in the schema), so refining them is not a GraphQL breaking change. The member-base wiring lives in the separate `@rytass/wms-module-graphql/adapters/member-base` entrypoint and imports nothing from member-base — it only reads the request fields `CasbinGuard` injects at runtime.

#### Every new Query/Mutation also needs a name in `WMS_OPERATION_NAMES`

`libs/core/src/lib/constants/operations.ts` holds the `WmsOperationName` union and its
runtime array. It is public API: it is what a consumer's `authChecker` keys off, what
`enabledOperations` / `disabledOperations` accept, and what `@rytass/wms-module-react`'s
`INVENTORY_ACTION_OPERATIONS` maps UI actions onto. A missing name means the deployment
switch for that operation **silently matches nothing**.
`libs/graphql/src/lib/operation-names.invariant.spec.ts` fails when the union and the
declared `@WmsOperation` requirements drift apart in either direction, and also checks that
every `operation` string in react's mapping table is a real name.

Note a name is **not** unique per schema field — several queries share one requirement
(`loader:read` covers 6 fields). That is why `disabledFields` exists.

#### Deployment switches prune resolvers before the schema is built

`enabledOperations` / `disabledOperations` / `disabledFields` on `forRootAsync` remove an
operation from the schema entirely (`libs/graphql/src/lib/registry`). Resolver metadata in
`@nestjs/graphql` is **lazy** — `@Query()` only registers a thunk with
`LazyMetadataStorage`, and `TypeMetadataStorage.queries` is still empty at `forRootAsync`
time — so pruning does two things that must stay paired: it deletes the method from the
resolver prototype **now** (because `ResolversExplorerService.explore()` walks the prototype
and runs before the metadata loads), and it wraps `addQueryMetadata` / `addMutationMetadata`
to drop the entry at load time. Only one is worse than neither: prototype-only leaves a
field resolving to `null`, metadata-only makes `makeExecutableSchema` reject the whole
schema. Pruning is process-global, so a process may register the module once.

#### Starting an inventory count locks its locations

`InventoryCountLockSubscriber` (`libs/core/src/lib/events`) refuses **any** stock movement
whose order item sits in a location scoped by a `COUNTING` inventory count. Like
`StockChangeSubscriber` it hooks the insert of every `*_order_change` row, so the twelve
domain services stay untouched and a consumer calling a service directly is covered too —
which is the case that matters. `inventory_count_order_changes` is exempt or settlement
would lock itself out. If you add a new `*_order_change` table, this subscriber covers it
automatically; if you add one that is *not* a stock movement, exempt it here.

The count's own entities (order, scope, item, change) are **not** in `WmsEntities` — they
are owned outright by this package, so reference them by class per the asymmetry rule above.

#### Every new Query/Mutation needs `@WmsMutationEvent` (mutations only)

The mutation event/hook system (`libs/graphql/src/lib/events`, `libs/core/src/lib/events`) lets consumers veto (`beforeHooks`) and observe (`afterListeners`) mutations. Each root `@Mutation` carries `@WmsMutationEvent({ event: '<domain>.<action>' })` next to its `@WmsOperation`; the `WmsMutationInterceptor` opens an `AsyncLocalStorage` dispatch scope, runs the before-hook (throw = veto, before any transaction), and flushes events **after the outermost transaction commits** (it awaits the handler, and `dataSource.transaction` resolves post-commit). **A bare `@Mutation` emits no operation event** — always add `@WmsMutationEvent` with a name from `WmsOperationEventName`. Do **not** add it to `@Query` or `@ResolveField`. Stock domain events (`stock.*`) are collected centrally by `StockChangeSubscriber` (a TypeORM subscriber on every `*_order_change` insert, keyed by table name + sign of `quantityChanged`) — services are not touched, so any new change-writing path is covered automatically; if you add a new `*_order_change` table, add it to that subscriber's `TABLE_TO_CHANGE_TYPE` map. **Invariant:** mutation resolvers must `await` all their DB writes (never fire-and-forget) or the post-commit guarantee breaks. The `@nestjs/event-emitter` bridge lives in the separate `@rytass/wms-module-graphql/adapters/event-emitter` entrypoint (optional peer dep).

#### Never resolve an overridable entity by its class

All six entities `WMSBaseModuleOptions` can replace — material, batch, location, stock, order, warehouse map — must be reached through their `Symbol`, never by importing the class as a value. Inject `WmsEntities` and read `this.entities.material` / `.batch` / `.location` / `.stock` / `.order` / `.warehouseMap`, or inject the individual Symbol where a service already does. A bare `manager.getRepository(BatchEntityClass)` re-introduces the split-brain bug: single-table inheritance stamps `entityName` per class, so writes land under the wrong discriminator and reads of the consumer's rows fall outside the queried subtree. The classes stay fine in **type** positions (generic bounds, `@Parent()` annotations) — only value positions matter.

Entities this package owns outright — batch groups, loaders, loader types, units, material units, sale orders, every `*_order` / `*_order_item` / `*_order_change` extension — have no base option to follow and are referenced by class directly. That asymmetry is the signal: if it is in `WmsEntities`, it is configurable.

The regression guards are `libs/graphql/src/lib/custom-material-entity.integration.spec.ts` (the material read paths in depth) and `custom-entities.integration.spec.ts` (all six at once, asserting the `entityName` each table ends up carrying). Both fail if a call site is reverted.

#### The overridable entity Symbols are bound in `core.module.ts`, not `ModelsModule`

`ModelsModule` binds every entity Symbol with `useValue` except the six overridable ones, which `WmsModuleCoreModule` provides from the `PROVIDE_*_ENTITY` tokens `WMSBaseModule` exports (since `@rytass/wms-base-nestjs-module` 0.3.0), each falling back to its built-in class. Binding them in both places would leave two live bindings per token and the winner would depend on which module the injector reached first — so `models.module.ts` filters them out of `ResolvedEntitiesProviders` via `EXTERNALLY_BOUND_ENTITIES` while keeping the classes in `forFeature` (each is the single-table root an override extends). Resolving at DI time rather than at module-definition time is what lets an override arrive from an async factory; do not "simplify" it back to `useValue`.

Consequence: the module **cannot** register a consumer's entity with TypeORM — `forFeature()` runs before the options resolve. `WmsEntities`' constructor checks `dataSource.hasMetadata` for all six and throws instead, because forgetting to register almost works (TypeORM copies a single-table child's columns into the parent, so `synchronize` still builds the right schema) and would otherwise surface as a bare `EntityMetadataNotFoundError` from inside a resolver.

#### The inventory count sheet does not ride on `inventoryCountOrder`

`InventoryCountOrderDto.items` still exists as a field resolver, but the detail page no
longer uses it: the sheet comes from `inventoryCountOrderItems` (paginated, nine filters,
`onlyVariance`), and the React fragment `InventoryCountOrder` deliberately does **not**
select `items`. A count covering an aisle runs to thousands of lines, and a field resolver
can take neither a page nor a filter. Two consequences: anything that must see the *whole*
sheet (the CSV export and the upload's row matching) has to fetch it unpaginated on
purpose — a truncated export comes back filled in and settles every missing line as a
shortage — and any new mutation on the detail page must invalidate **both**
`InventoryCountOrderDocument` and `InventoryCountOrderItemsDocument`, which is what
`refetchOrder` in `libs/react/.../inventory-count/useApi.ts` is for.

#### Batch commercial attributes are matched exactly, never with ILIKE

`vendorId` / `customerId` / `saleId` / `saleSerialId` live on the batch and are filterable
on both the stock queries (`FindStockArgs`) and the count sheet
(`FindInventoryCountOrderItemArgs`). Unlike the key filters next to them, they use `=`, not
`ILIKE`: they are identifiers the host system owns, and a substring match on `SO-1` quietly
returns `SO-10` as well — a wrong answer that looks entirely plausible. The guard is
`libs/graphql/src/lib/stock-batch-attribute-filters.integration.spec.ts`.

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
