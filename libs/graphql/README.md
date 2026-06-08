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
| [`docs/api-reference.md`](./docs/api-reference.md) | Complete export catalog with signatures and usage examples |

GitHub hosted links (always up-to-date):

- [Integration Guide — §4 Backend setup](https://github.com/Rytass/WMS-Module/blob/main/docs/integration-guide.md#4-backend-setup-nestjs--graphql--typeorm)
- [Integration Guide — §13.1 Existing GraphQLModule co-existence](https://github.com/Rytass/WMS-Module/blob/main/docs/integration-guide.md#13-integrating-into-an-existing-nestjs--nextjs-project)
- [API Reference — @rytass/wms-module-graphql](https://github.com/Rytass/WMS-Module/blob/main/docs/api-reference.md#rytasswms-module-graphql)

## License

MIT
