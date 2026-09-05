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
8. `libs/<name>/tsconfig.typecheck.json` and an explicit `typecheck` target — see below; the inferred one emits
9. `project.json` — a `pkg-quality` target running `node tools/pkg-gate.mjs libs/<name>`, and `prepublish-check` depending on `typecheck`, `lint`, `build`, `pkg-quality`

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

#### A service query method needs a test that calls it directly

Every one of the integration specs enters through the GraphQL schema, and every resolver on
the way in fills in the arguments it cares about. That leaves a whole class of defect
invisible: anything a **published service signature allows but no in-repo caller ever
produces**. `StockService.findAggregatedStocks` carried an optional `aggregated?: boolean`
whose default value produced `column agg."saleSerialId" does not exist` — 79 passing tests
could not see it, because the six resolvers that reach that method all passed
`aggregated: true` themselves.

So: when a service method is exported from `@rytass/wms-module-core` and takes optional
arguments, at least one spec must call it the way a consumer would — `app.get(TheService)`
and then the method, with the optional arguments left out. Reaching it through a resolver
tests the resolver's defaults, not the contract. The example lives at the end of
`libs/graphql/src/lib/stock-batch-attribute-filters.integration.spec.ts`.

A corollary for the signatures themselves: an optional parameter with exactly one workable
value is not a parameter. Fix the method, do not document the one value that works.

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

#### `PENDING_INSPECTION` needs `requiresInspection`, not just a null result

`inspectionResult IS NULL` is the resting state of essentially **every** batch in the
warehouse, so reading it as "awaiting inspection" made the status report the whole
warehouse. The answer was never zero and never absurd, which is why it survived.

The missing half is intent. `batches.requiresInspection` records that somebody actually asked
— `ReceiveInventoryOrderService.receive` sets it when a receive item carries
`requireInspection` and arrives without a result — and the filter is now
`requiresInspection = true AND inspectionResult IS NULL`. **Three** places render that icon
and all three need both halves: `utils/columns.tsx`, `inventory-list/Table/GroupTable.tsx`,
and `inventory-count/view` — the count sheet snapshots the flag onto
`inventory_count_order_items` alongside `held` / `inShipment`, because a settled count has to
keep showing what the world looked like at the time.
`InventoryActions.QualityInspection` deliberately still gates on `inspectionResult` alone:
"can I inspect this" is a different question from "is this waiting".

Consequences:

- **`requireInspection` defaults to `true`**, so this is the ordinary receive path, not an
  edge case. Splitting unconditionally moved *every* default receipt off the batch key the
  caller asked for and onto a synthetic child, which an exact-id lookup then could not find.
  So the receive splits **only when the batch already holds stock**; a batch with nothing on
  it yet has nothing to commingle with and is flagged in place.
- `requiresInspection` is part of the batch identity in `splitBatch` (a flagged child must not
  collapse into an unflagged sibling) but deliberately **not** in `getBatch`'s lookup: given
  `UNIQUE (key, materialId)` there is one row per key, and hiding a flagged one would leave
  the next lookup trying to create a duplicate.
- Existing rows get the column default `false`, so a deployment upgrading across this needs
  to decide what its already-null batches meant. There is no generic backfill: the honest
  answer comes from the deployment's own receive history.

#### The consumption order handles work-in-progress with a location, not a status

`ConsumptionOrderService` (`libs/core/src/lib/services/consumption-order.service.ts`) covers
material handed to a process that eats some of it: `issue()` out to a consuming location,
`return()` what came home, `settle()` what was used. **Three actions on one order**, matching
the grammar of hold/release, allocate/deallocate and transfer/cancel.

There is deliberately **no `IN_PRODUCTION` / work-in-progress status**. Status here is a flag
on the *batch*, so a status would force every partial issue to split a child batch off, and
one batch key per issue is a worse answer than one location. An issue is a plain location
move: the same batch key sits in two places and the aggregate adds up. `excludeLocationIds`
is how a stock report drops the consuming location.

Nothing in it is manufacturing-specific, and that is on purpose — a subcontract, a repair job
and a kitchen prep list are the same shape. **What the process actually is belongs in
`order_references`**, which can name *which* work order; a status could only ever say "some".

Two things to keep in mind when touching it:

- `consumption_order_changes` carries a `kind` column (`ISSUE` / `RETURN` / `SETTLE`) because
  a return and a settlement are **both negative** — the sign convention every other change
  table relies on cannot separate them. `TABLE_TO_CHANGE_TYPE` in `StockChangeSubscriber` was
  widened to take the whole change row rather than just the quantity for exactly this, and
  its resolvers may now return `null` for a row they cannot classify (no event beats a wrong
  one).
- Nothing is denormalised onto the item. `getProgress` and the `issuedQuantity` /
  `outstandingQuantity` resolvers read the change rows back every time, because those rows
  are what the stock ledger and the `stock.*` events agree with; a counter kept alongside
  them is a second answer waiting to disagree.
- **Everything inside `act` is in base units.** `quantityChanged` is written in base units
  while `targetConsumedQuantity` is stored in the line's own unit, so `getProgress` converts
  the target and `act` converts a caller's `quantity` on the way in. Comparing the two
  unconverted made a whole-order `return` or `settle` on a non-base unit ask for the
  conversion factor times what was there — impossible — and a partial issue strand the line
  permanently. Every spec used a factor of 1, which is why it stayed green.
  `ReceiveInventoryOrderService` resolves the same tension the same way; follow it.
- `act` takes a `pessimistic_write` lock on the order row and accumulates what the current
  call has moved. The guard rests on a snapshot read once, so without the lock two
  transactions both see an untouched line, and without the accumulator two lines naming the
  same item in one call do. `validateStockAvailability` catches neither: it checks the shelf,
  not the order's target.

#### `customChangeTables` is the only extension point for a host's own order family

A host that writes its own order family already inherits almost everything, without asking:

- **transactions and stock arithmetic** — `dataSource.transaction`,
  `StockService.validateStockAvailability` and `BaseOrderService` (exported) are public API;
- **the inventory count lock** — `InventoryCountLockSubscriber` keys off
  `tableName.endsWith('_order_changes')`, so it covers a table this package has never heard
  of, provided the change row reaches an order item carrying a `locationId` through an `item`
  relation;
- **the ledger and change history**, because those are `stocks` rows, not a table we own.

The one gap was the event: `StockChangeSubscriber`'s table→`ChangeType` map is closed.
`forRootAsync({ customChangeTables })` registers into it. The resolver is handed the whole
change row and returns a `ChangeType` (reuse our vocabulary — the row then emits that type's
real `stock.*` event and counts in reports like any built-in movement), any other string
(emits `stock.custom` with the host's name in `payload.customChangeType`), or `null` (emit
nothing).

`stock.custom` is **one** event name rather than an open union, on purpose: `WmsStockEventName`
stays closed, so the typed listener map, the GraphQL `ChangeType` enum and every consumer's
exhaustive switch keep working.

**Do not widen this into custom order types, resolvers or schema.** That would trade the
module's one real guarantee — that it knows what every movement in it means — for something a
host can already do with an entity of its own. A movement we cannot classify is a hole in our
reports; that is the bargain, and it is why a host-defined string should be a proposal
upstream once it stops being one deployment's special case.

Registration is validated at module-definition time (`core.module.ts`): shadowing an owned
table, registering one twice, or missing the `_order_changes` suffix all throw. Each of those
mistakes otherwise looks exactly like working software until someone reads a report. **A new
change table this package owns must be added to `OWNED_CHANGE_TABLES` as well as to
`TABLE_TO_CHANGE_TYPE`.**

#### The event guarantee belongs to `WmsOperationRunner`, not the interceptor

Before-hook → dispatch scope → operation event → one post-commit flush. That sequence lives
in `WmsOperationRunner` (`libs/core/src/lib/events/wms-operation-runner.ts`), and
`WmsMutationInterceptor` is a thin adapter that adds the two things only a GraphQL request
can supply: the raw arguments and the actor. **Do not reimplement the sequence anywhere
else** — the whole point is that a host calling a domain service directly gets exactly what a
mutation gets. Nesting is safe; only the outermost run flushes.

`run({}, fn)` with no `event` opens a scope without an operation event, which is what a host
wants when it just needs the `stock.*` events a service collects to actually go somewhere.

Consequences of that living in core:

- The event tokens (`WMS_EVENT_OPTIONS`, `WMS_ACTOR_EXTRACTOR`), `WmsEventDispatcher`,
  `WmsOperationRunner` and the emitter-bridge provider are all bound by
  `WmsModuleCoreModule`. `WmsModuleGraphqlModule.forRootAsync` keeps accepting
  `beforeHooks` / `afterListeners` / `actorExtractor` / `eventEmitterBridge` and **forwards
  them down**. Binding either set in both modules would leave two live bindings per token —
  the same hazard the overridable entity Symbols avoid.
- `WmsBeforeHookContext.executionContext` is `ExecutionContext | null`, with a `source:
  'graphql' | 'host'` discriminant next to it. A direct service call has no execution context
  and fabricating one would hand a hook a lie. Branch on `source`.
- **`WmsModuleGraphqlModuleAsyncOptions` `Omit`s `beforeHooks` and `afterListeners` from the
  core options before re-declaring them.** Both keys exist on both types, and an intersection
  makes TypeScript resolve an *inline* object literal against the looser core member — so
  `ctx.payload.result` silently degraded to `unknown` for exactly the inline form the docs
  advertise, with no error at the declaration site to point at the cause. `beforeHooks` is
  omitted too even though its two context types are structurally identical today: that
  identity is not a contract, and typing `args` per event would break it. Keep
  `WmsTypedBeforeHookContext` in step with `WmsBeforeHookContext` for the reader's sake, but
  compilation no longer depends on it.

The coverage is `libs/graphql/src/lib/wms-operation-runner.integration.spec.ts`, which is also
the only test the event system has; it drives both paths and asserts a veto leaves no rows.

#### An upstream document is recorded in `order_references`, never on the order

Orders here record what moved and when, never what for. `order_references`
(`libs/core/src/lib/models/extensions/order-reference`) is the one place a host says which
of *its* documents an order was opened for: `(orderType, orderId, itemId?, referenceType,
referenceId, referenceLine?, metadata?)`. One polymorphic table rather than three columns on
each of the thirteen order entities — a new order family picks it up for free, and a
line-level reference has somewhere to live without widening every item table.

`orderType` is `WmsOrderType`, whose values are exactly the `resource` half of the matching
`WmsOperationName`s. Reusing those strings is the point: one vocabulary for the switch, the
permission and the reference. **Renaming a value is a breaking change** — it is persisted.

`referenceType` / `referenceId` are opaque and matched with `=`, never `ILIKE`, for the same
reason as the batch commercial attributes above. The module never resolves them; a host turns
one into a link through react's `referenceLinkResolver`.

`ShipInventoryOrderReferenceEntityClass` is **not** this. Despite the name it is a line-level
shipment plan (it carries quantities and a removal timestamp). The two coexist; do not merge
them.

#### `batches.parentBatchId` is written once, at creation

Every status in this model is a flag on the *batch* (`held`, `inShipment`, `transferId`) and
`stocks` has no status column at all — `StockService.selectQueryBuilder` derives it. So acting
on **part** of a batch splits a child off first (`HoldInventoryOrderService` does this
internally, as do ship, transfer, allocate, customer, vendor and inspection). `parentBatchId`
is what makes those children traceable; following it upwards yields the root batch a label or
shipping document should print.

Two rules: it is set only when `BatchService.splitBatch` / `getBatch` *creates* a batch, never
rewritten (a reused sibling keeps the parent it was first created from), and it is set to the
batch being split, **not** inherited from the spread of that batch's own row — inheriting it
flattens the chain by one link. The stock ledger stays the authority on what actually moved.

#### `batches.attributes` is stored verbatim and never validated

Host-defined batch attributes (a grade, a bin code, a die count) live in a `jsonb` column. The
module reads nothing out of it and enforces no schema: what those keys mean belongs to the
host, and a schema enforced here would be a second, weaker copy of the host's own. It exists
because a `batchEntity` override solves storage but not visibility — a column the module does
not know about cannot be carried through a split or shown on a batch row.

It **is** part of a batch's identity for split reuse: `splitBatch` compares it as `jsonb`
(content equality, so key order does not matter), so two splits asking for different
attributes produce two batches. `getBatch` is the exception — it matches on `key` alone and
applies attributes only on creation, because `key` is the batch's identity and attributes
describe rather than distinguish.

Exposed through GraphQL as the `JSONObject` scalar in `libs/graphql/src/lib/scalars`, defined
in-repo on top of `graphql` rather than pulled from `graphql-type-json` so the peer dependency
list does not grow. It deliberately rejects bare scalars, arrays and class instances.

#### DTO and entity nullability must match

GraphQL DTOs in `libs/graphql/src/lib/dto/*.dto.ts` are returned from services that hand back the TypeORM entity. If the entity column is `string | null`, the DTO field must also declare `string | null` plus `@Field(() => String, { nullable: true })`. Mismatches trigger TS2322 (we suppress it in build via `noEmitOnError: false`, so the build still succeeds but the published `.d.ts` lies about the contract). Check both sides whenever you add or modify a nullable column.

#### Rollup externals must track peer deps

Each `libs/*/rollup.config.mjs` keeps an `externalPatterns` array. When you add a peer dependency to a lib's `package.json` you must also add the package name (and any sub-path regex like `/^lodash\//`) to that array, otherwise Rollup will bundle the dep into our output — bloating the package and locking consumers to one specific version. The dependencies are not auto-synced.

It cuts the other way too, and that half went unnoticed for every release so far: marking a
package external and **not** declaring it makes the emitted `import` a dangling reference.
`core` and `graphql` emit `import { __decorate } from 'tslib'` from every decorated class,
`tslib` was external, and it was in nobody's `dependencies` — both packages were broken on a
clean `npm install` from their first publish. Every real consumer is a NestJS app that
already has `tslib`, so only a clean install could have caught it, and neither publint nor
attw reads the JavaScript. `tools/pkg-gate.mjs` now does; see `RELEASING.md`.

#### `core` and `graphql` are dual-format packages

```
index.cjs.js   CJS bundle          ← "require"          "type": "commonjs" makes .js CJS
index.mjs      ESM, one file per   ← "import"           .mjs is ESM regardless
lib/**/*.mjs   source module
index.d.ts     declarations        ← "require".types    CJS-flavoured, one copy
index.d.mts    one-line re-export  ← "import".types     ESM-flavoured
```

The ESM tree must be `.mjs`. Emitting it as `.js` under `"type": "commonjs"` makes Node parse
it as CommonJS and reject the `export` keyword — a break that Node 22.7+ hides by retrying as
ESM, which is why it survived as nothing but an attw warning that had been waived.

There is **one** declaration tree, CJS-flavoured, serving the `require` condition. The
`import` condition gets a one-line `.d.mts` per entry point re-exporting it, written by
`tools/emit-esm-type-shims.mjs` at the end of the build — a second full tree would double the
package for no new information. ESM importing CJS types is legal; the reverse is not, so the
asymmetry only works in this direction. The shim is `export *`, which does not carry a
default, and the script refuses to write one for a barrel that has a default export rather
than dropping it silently.

A new entry point therefore means: an `exports` entry with `import`/`require` conditions, a
rollup ESM input **and** a CJS bundle for it, and its name appended to the
`emit-esm-type-shims.mjs` call in `project.json`. Miss the last one and the `import`
condition points at a `.d.mts` that does not exist.

#### `typecheck` must be declared explicitly, and must not emit

`@nx/js/typescript` infers `typecheck` from `tsconfig.lib.json`, which for all three libs is a
*build* config (`outDir: "."`, `declaration: true`). The inferred command
(`tsc --build --emitDeclarationOnly`) therefore writes declarations over the ones `build` just
produced, and `prepublish-check` runs the two in parallel — so whichever finished last decided
what shipped. Each lib declares its own `typecheck` target against a `tsconfig.typecheck.json`
with `noEmit`. Deleting one silently restores the race.

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
