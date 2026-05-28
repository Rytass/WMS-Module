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
import { ApolloDriver } from '@nestjs/apollo';
import { resolve } from 'node:path';
import { WmsModuleGraphqlModule } from '@rytass/wms-module-graphql';

@Module({
  imports: [
    TypeOrmModule.forRoot({ /* ...db config... */ }),
    WmsModuleGraphqlModule.forRootAsync(
      {
        useFactory: async () => ({}),
        defaultLoaderSerialId: 'DEFAULT',
        defaultLoaderTypeKey: 'DEFAULT',
        defaultLocationKey: 'DEFAULT',
      },
      {
        driver: ApolloDriver,
        useFactory: async () => ({
          autoSchemaFile: resolve(process.cwd(), 'schema.gql'),
          playground: false,
          introspection: true,
          cors: true,
          autoTransformHttpErrors: true,
        }),
      },
    ),
  ],
})
export class AppModule {}
```

The first argument is `WmsModuleCoreModuleAsyncOptions` (merged from `@rytass/wms-module-core` — same shape as `WMSBaseModuleAsyncOptions` plus the three `default*` keys). The second is a standard `@nestjs/graphql` `GqlModuleAsyncOptions` — extend the `useFactory` to override the Apollo config (cors, plugins, custom scalars, etc.).

`WmsModuleGraphqlModule` internally wires `WmsModuleCoreModule.forRootAsync` so you do not need to import the core module separately when using this package.

## DataLoader context

The module ships a `HelperModule` that provides DataLoader instances for batched entity lookups, automatically injected into the GraphQL context so resolvers can avoid N+1 queries:

```ts
context: async (contextArg) => ({
  loaders: {
    batchSingle: ...,
    batchMany: ...,
    batchManyWithPagination: ...,
  },
  ...contextArg,
})
```

Custom context factories from `gqlOptions.useFactory` are merged with the loaders — your existing context fields survive the wrap.

## Schema artefacts

The schema is generated at boot via `autoSchemaFile` (above). Commit the resulting `schema.gql` to your repo if you want downstream codegen (e.g. for `@rytass/wms-module-react`) to consume a stable schema snapshot.

## License

MIT
