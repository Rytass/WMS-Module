# @rytass/wms-module-graphql

GraphQL resolvers, mutations, queries and DTOs for the Rytass Warehouse Management System (WMS). Exposes the full WMS domain (loaders, materials, batches, stock, locations, transfers, inventory orders, quality inspection, scrape, warehouse map) as a NestJS [`GraphQLModule`](https://docs.nestjs.com/graphql/quick-start).

Pair with [`@rytass/wms-module-core`](https://www.npmjs.com/package/@rytass/wms-module-core) for the service layer and [`@rytass/wms-module-react`](https://www.npmjs.com/package/@rytass/wms-module-react) for ready-made admin UI.

## Install

```bash
yarn add @rytass/wms-module-graphql @rytass/wms-module-core
# peer deps
yarn add @nestjs/common @nestjs/graphql @nestjs/apollo @apollo/server graphql dataloader reflect-metadata rxjs
```

## Quick start

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { resolve } from 'node:path';
import {
  WmsModuleGraphqlModule,
  LoaderService,
  createWmsLoaders,
} from '@rytass/wms-module-graphql';

@Module({
  imports: [
    TypeOrmModule.forRoot({ /* ...db config... */ }),
    WmsModuleGraphqlModule.forRootAsync({
      useFactory: async () => ({}),
      defaultLoaderSerialId: 'DEFAULT',
      defaultLoaderTypeKey: 'DEFAULT',
      defaultLocationKey: 'DEFAULT',
    }),
    GraphQLModule.forRootAsync({
      driver: ApolloDriver,
      inject: [LoaderService],
      useFactory: (loaderService: LoaderService) => ({
        autoSchemaFile: resolve(process.cwd(), 'schema.gql'),
        playground: false,
        introspection: true,
        cors: true,
        autoTransformHttpErrors: true,
        context: ({ req }) => ({
          ...createWmsLoaders(loaderService),
          // your own context fields stay yours — no silent overwrite
          user: req.user,
        }),
      }),
    }),
  ],
})
export class AppModule {}
```

`WmsModuleGraphqlModule.forRootAsync` takes a single argument (`WmsModuleCoreModuleAsyncOptions`, re-exported from `@rytass/wms-module-core` — same shape as `WMSBaseModuleAsyncOptions` plus the three `default*` keys). It registers the resolvers/queries/mutations as composable NestJS providers and exposes `LoaderService` as a `@Global()` DI token; it does **not** start Apollo Server.

You register a **single** `GraphQLModule.forRootAsync(...)` of your own, mix your resolvers with the WMS resolvers in the same schema, and own the Apollo / context configuration end-to-end.

`WmsModuleGraphqlModule` internally wires `WmsModuleCoreModule.forRootAsync` so you do not need to import the core module separately when using this package.

## Authorization

Every WMS root `@Query` / `@Mutation` is annotated with `@WmsOperation({ resource, action })` — a **host-neutral** permission requirement enforced by the library's own route-level `WmsAuthGuard`, which delegates the allow/deny decision to an `authChecker` **you** supply. The library never imports your auth system; you map WMS's `resource`/`action` onto whatever you use (Casbin, RBAC, JWT scopes…).

> ⚠️ **Using a global guard (e.g. member-base's `CasbinGuard` as `APP_GUARD`)?** A deny-by-default global guard blankets *every* resolver in the schema, including WMS's, and rejects them all because they carry no host-specific metadata — "every WMS operation is forbidden". WMS fixes this by stamping each operation with a host-skip marker so your global guard **defers**, while `WmsAuthGuard` does the real enforcement. **You do not touch your global guard.**

```ts
import { WmsModuleGraphqlModule } from '@rytass/wms-module-graphql';
import { createMemberBaseWmsAuthChecker } from '@rytass/wms-module-graphql/adapters/member-base';

WmsModuleGraphqlModule.forRootAsync({
  useFactory: async () => ({}),
  defaultLoaderSerialId: 'DEFAULT',
  defaultLoaderTypeKey: 'DEFAULT',
  defaultLocationKey: 'DEFAULT',
  // optional — omit to stay fully permissive (local dev / demos)
  authChecker: createMemberBaseWmsAuthChecker({
    map: ({ resource, action }) => [[`wms:${resource}`, action]],
  }),
});
```

The member-base adapter reuses everything `CasbinGuard` already put on the request (verified `payload`, `enforcer`, your custom `casbinPermissionChecker`) so WMS enforces with the **exact same** policy engine as your own resolvers — with **zero** member-base import on the WMS side. For custom JWT/RBAC, pass your own `authChecker: (ctx, { resource, action }) => boolean`.

➡️ **Full design & recipes: [`docs/authorization.md`](./docs/authorization.md)** (the problem, execution order, member-base / custom-JWT / no-guard recipes, the single coupling point, public API, FAQ).

## Events & Hooks

Intervene in and get notified about mutations. Every root mutation carries a typed **operation event** (`material.created`, `ship-inventory-order.shipped`, …) and fans out **stock domain events** (`stock.allocated`, `stock.shipped`, …) driven by the `ChangeType` state machine. Wire two opt-in hook points via `forRootAsync`:

- **`beforeHooks`** run before any DB work — **throw to veto** the mutation (zero side effects).
- **`afterListeners`** run **after the outermost transaction commits** — never notified about rolled-back changes.

```ts
import { memberBaseActorExtractor } from '@rytass/wms-module-graphql/adapters/member-base';

WmsModuleGraphqlModule.forRootAsync({
  ...coreOptions,

  // (v2) populate payload.actor on every event — reads req.payload → { id, domain }
  actorExtractor: memberBaseActorExtractor,

  // (v2) append materialId/batchId/locationId/loaderId to stock event payloads
  enrichStockEvents: true,

  beforeHooks: {
    'ship-inventory-order.shipped': async ({ args, actor }) => {
      if (!allowed(args, actor)) throw new ForbiddenException('blocked');
    },
  },
  afterListeners: {
    // v2: payload.args carries items[]; payload.actor carries { id, domain }
    'ship-inventory-order.shipped': async ({ payload }) => {
      await erp.markShipped(payload.id, payload.result, payload.actor);
    },
    // v2 with enrichStockEvents: materialId/batchId/locationId/loaderId also available
    'stock.allocated': async ({ payload }) => { await erp.reserve(payload); },
  },
});
```

**v2 payload enrichment** (upcoming minor — `core@0.3.0` / `graphql@0.6.0`):

- Operation events gain `args` (the GraphQL input that triggered the mutation) and `actor`
  (`WmsActor | null`). Nine action mutations return `boolean`; their real information is in
  `args` and the stock events they fan out.
- Stock events gain opt-in `materialId / batchId / locationId / loaderId` when
  `enrichStockEvents: true` is set. **Caveat**: split / merge / reclassify order-items have
  no `materialId` / `batchId` at the item level — only `locationId` / `loaderId` are
  available for those three domains even with eager enrichment.
- `WmsOperationResultMap` provides a per-event typed overlay so subscribers receive the
  concrete DTO (`MaterialDto`, `ShipInventoryOrderDto`, …) instead of `unknown`.

Post-commit delivery is guaranteed by an `AsyncLocalStorage` dispatch scope (events buffer during the request and flush only after commit). Prefer `@OnEvent`? Opt into the optional [`@nestjs/event-emitter`](https://docs.nestjs.com/techniques/events) bridge from `@rytass/wms-module-graphql/adapters/event-emitter` — every event also emits as `wms.<event>`. Nothing configured ⇒ no events, zero overhead.

➡️ **Full design, the complete 56-event list & limitations: [`docs/events.md`](./docs/events.md)**.

## DataLoader context

The module ships a `HelperModule` (auto-registered) that provides a singleton `LoaderService`. To avoid N+1 queries, the WMS resolvers expect a per-request DataLoader trio at `context.loaders`:

```ts
type WmsLoaders = {
  batchSingle: DataLoader<...>;
  batchMany: DataLoader<...>;
  batchManyWithPagination: DataLoader<...>;
};
```

Inject `LoaderService` into your `GraphQLModule.forRootAsync` factory and call `createWmsLoaders(loaderService)` **per request** inside `context`. The helper returns a `{ loaders: WmsLoaders }` fragment that is safe to spread:

```ts
context: ({ req }) => ({
  ...createWmsLoaders(loaderService),   // adds `loaders: { batchSingle, ... }`
  user: req.user,                       // your fields preserved
  csrfToken: req.headers['x-csrf'],
}),
```

Per-request is non-negotiable — DataLoader caches results inside the instance, so reusing one across requests leaks data between callers. `createWmsLoaders` is a thin factory you call from inside `context`, never at module scope.

## Schema artefacts

The schema is generated at boot via `autoSchemaFile` (above). Commit the resulting `schema.gql` to your repo if you want downstream codegen (e.g. for `@rytass/wms-module-react`) to consume a stable schema snapshot.

## Documentation

Full documentation is shipped inside this package under the `docs/` directory (available after `npm install`):

| Document | Description |
|---|---|
| [`docs/integration-guide.md`](./docs/integration-guide.md) | Step-by-step wiring guide for NestJS + Next.js consumers |
| [`docs/authorization.md`](./docs/authorization.md) | Complete resolver-authorization design & integration recipes (member-base / custom JWT / no-guard) |
| [`docs/events.md`](./docs/events.md) | Mutation event/hook system — before-hooks (veto), post-commit after-listeners, complete event list, event-emitter bridge |
| [`docs/api-reference.md`](./docs/api-reference.md) | Complete export catalog with signatures and usage examples |

GitHub hosted links (always up-to-date):

- [Integration Guide — §4 Backend setup](https://github.com/Rytass/WMS-Module/blob/main/libs/graphql/docs/integration-guide.md#4-backend-setup-nestjs--graphql--typeorm)
- [Integration Guide — §13.1 Existing GraphQLModule co-existence](https://github.com/Rytass/WMS-Module/blob/main/libs/graphql/docs/integration-guide.md#13-integrating-into-an-existing-nestjs--nextjs-project)
- [Authorization — design & recipes](https://github.com/Rytass/WMS-Module/blob/main/libs/graphql/docs/authorization.md)
- [Events & Hooks — design & event list](https://github.com/Rytass/WMS-Module/blob/main/libs/graphql/docs/events.md)
- [API Reference — @rytass/wms-module-graphql](https://github.com/Rytass/WMS-Module/blob/main/libs/graphql/docs/api-reference.md#rytasswms-module-graphql)

## License

MIT
