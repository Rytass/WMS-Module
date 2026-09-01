# Integration Guide

How to build a Warehouse Management System on top of the `@rytass/wms-module-*` packages.

Target audience: engineers integrating WMS into a new product who want a working backend + frontend with the smallest possible amount of glue code.

> Companion document — **[API Reference](./api-reference.md)** — complete export catalog for all three packages.

## Table of Contents

1. [Overview & design philosophy](#1-overview--design-philosophy)
2. [Prerequisites](#2-prerequisites)
3. [Quick start (60 seconds)](#3-quick-start-60-seconds)
4. [Backend setup (NestJS + GraphQL + TypeORM)](#4-backend-setup-nestjs--graphql--typeorm)
   - [4.6 Version compatibility matrix](#46-version-compatibility-matrix)
5. [Frontend setup (Next.js Pages Router)](#5-frontend-setup-nextjs-pages-router)
6. [Pages Router shell pattern (the 19 thin shells)](#6-pages-router-shell-pattern-the-19-thin-shells)
7. [Apollo client wiring](#7-apollo-client-wiring)
8. [Authentication, authorization & events](#8-authentication-authorization--events)
   - [8.5 Backend authorization (resolver-level)](#85-backend-authorization-resolver-level)
   - [8.6 Mutation events & hooks](#86-mutation-events--hooks)
9. [Database support matrix](#9-database-support-matrix)
10. [Seed data for demos](#10-seed-data-for-demos)
11. [Deployment notes](#11-deployment-notes)
12. [Known issues & roadmap](#12-known-issues--roadmap)
13. [Integrating into an existing NestJS / Next.js project](#13-integrating-into-an-existing-nestjs--nextjs-project)
    - [13.14 GraphQL type name conflicts](#1314-graphql-type-name-conflicts)
14. [Reference implementation (`wms-standalone`)](#14-reference-implementation-wms-standalone)

---

## 1. Overview & design philosophy

WMS is packaged as three layered npm libraries:

```
+-------------------------------+
| wms-module-react              |   React UI + Apollo client + GraphQL ops
| (consumer page shells)        |   ---------------------------------------
+--------------+----------------+   Default exports are full page bodies.
               |                    Consumer pages are 7-12 line shells.
               v
+-------------------------------+
| wms-module-graphql            |   Resolvers, DTOs, DataLoader helpers
| (composable providers + your  |   ---------------------------------------
|  own GraphQLModule.forRoot)   |   Exposes resolvers; depends on core for
+--------------+----------------+   entities + services.
               v
+-------------------------------+
| wms-module-core               |   TypeORM entities, services, DI tokens
| (domain logic)                |   ---------------------------------------
+-------------------------------+   Loaded indirectly through graphql.
                                    Consumers rarely import from core.
```

**Design intent**: the consumer writes **wiring code only**. Domain logic — entities, services, resolvers, queries, mutations, DataLoaders, React components, Apollo wiring, GraphQL operations — all lives in the three packages.

The reference consumer ([`wms-standalone`](#13-reference-implementation-wms-standalone)) is **~570 LOC of glue code** including 19 Pages Router shells. The only file with non-trivial logic is a 79-line Navigation component that calls `useRoutes()` from the lib and renders Mezzanine UI's `<Navigation>`.

---

## 2. Prerequisites

| Dependency      | Version                              | Notes                                        |
|-----------------|--------------------------------------|----------------------------------------------|
| Node.js         | 20 LTS or later                      | The libs build for ES2022.                   |
| Package manager | pnpm 9+ (recommended), Yarn 4, npm 10+| pnpm's strict hoisting is honored.           |
| PostgreSQL      | 14 or later                          | Entities use `timestamptz`. See section 9.   |
| Browser runtime | Modern browsers with ES2022 support  | The React package ships ESM only.            |

The frontend package (`wms-module-react`) is **ESM-only** (`"type": "module"`). Bundlers that target Next.js / Vite / webpack 5 handle this transparently; classic CJS-only Node tools do not.

### 2.1 pnpm build-script approval

If you are on **pnpm 9 or newer**, the first `pnpm install` will refuse to run native build scripts for several transitive dependencies and surface `ERR_PNPM_IGNORED_BUILDS`. This is pnpm's supply-chain protection, not a WMS issue, but it is the very first error a fresh integrator hits.

Resolve it once by approving the packages WMS transitively needs to build:

```bash
pnpm approve-builds
# Or, in pnpm-workspace.yaml:
# allowBuilds:
#   '@apollo/protobufjs': true
#   '@nestjs/core': true
#   '@parcel/watcher': true
#   sharp: true
```

After approval, `pnpm install` completes cleanly. The exact list pnpm asks you to approve depends on your other dependencies; the four above are the ones triggered by WMS's NestJS + Apollo + native-image stack.

---

## 3. Quick start (60 seconds)

```bash
# 1. Create a workspace and install the three packages plus their peers
mkdir my-wms && cd my-wms
pnpm init
pnpm add @rytass/wms-module-core @rytass/wms-module-graphql @rytass/wms-module-react
pnpm add @nestjs/common @nestjs/core @nestjs/graphql @nestjs/typeorm \
        @nestjs/apollo@~13.1.0 @nestjs/config @nestjs/platform-express @apollo/server@^4 \
        typeorm pg reflect-metadata graphql rxjs \
        class-transformer class-validator \
        @as-integrations/express5

# 2. Wire NestJS in 17 + 52 lines (apps/api/src/main.ts and app/app.module.ts)
# 3. Wire Next.js in 31 + 29 lines (apps/client/src/pages/_app.tsx and next.config.ts)
# 4. Add 19 page shells, each 7-12 lines

# That is the entire integration.
```

Detailed steps in sections 4-7.

---

## 4. Backend setup (NestJS + GraphQL + TypeORM)

### 4.1 `apps/api/src/main.ts`

Standard NestJS bootstrap. The library puts no constraints on the bootstrap file.

```ts
import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  const port = process.env['PORT'] || 7103;
  await app.listen(port);
  Logger.log(`Application is running on: http://localhost:${port}/${globalPrefix}`);
}

bootstrap();
```

### 4.2 `apps/api/src/app/app.module.ts`

Two registrations: `WmsModuleGraphqlModule.forRootAsync(...)` wires the WMS resolvers, entities, services and `LoaderService`; your own `GraphQLModule.forRootAsync(...)` starts Apollo Server and owns the context factory. The two participate in **one** schema — NestJS's schema builder discovers every `@Resolver()` provider across all imported modules.

```ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { GraphQLModule } from '@nestjs/graphql';
import {
  WmsModuleGraphqlModule,
  LoaderService,
  createWmsLoaders,
} from '@rytass/wms-module-graphql';
import { ApolloDriver } from '@nestjs/apollo';
import {
  ApolloServerPluginLandingPageLocalDefault,
} from '@apollo/server/plugin/landingPage/default';
import { resolve } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),

    // PostgreSQL via TypeORM
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService): TypeOrmModuleOptions => ({
        type: 'postgres',
        host: cfg.getOrThrow<string>('WMS_DB_HOST'),
        port: cfg.get<number>('WMS_DB_PORT', 5432),
        username: cfg.getOrThrow<string>('WMS_DB_USER'),
        password: cfg.getOrThrow<string>('WMS_DB_PASS'),
        database: cfg.getOrThrow<string>('WMS_DB_NAME'),
        schema: cfg.getOrThrow<string>('WMS_DB_SCHEMA'),
        autoLoadEntities: true,
        synchronize: true, // dev/demo only; use migrations in production
        logging: false,
      }),
    }),

    // WMS resolvers + LoaderService — no Apollo Server is started here
    WmsModuleGraphqlModule.forRootAsync({
      useFactory: async () => ({}),
      // Module-init seed values; the keys you pass here are created
      // on first boot for `location`, `loaderType`, and `loader`.
      defaultLoaderSerialId: 'DEFAULT',
      defaultLoaderTypeKey: 'DEFAULT',
      defaultLocationKey: 'DEFAULT',
    }),

    // YOUR Apollo / Schema / Context registration
    GraphQLModule.forRootAsync({
      driver: ApolloDriver,
      inject: [LoaderService],
      useFactory: (loaderService: LoaderService) => ({
        playground: false,
        introspection: true,
        cors: true,
        csrfPrevention: false,
        plugins: [ApolloServerPluginLandingPageLocalDefault()],
        autoTransformHttpErrors: true,
        autoSchemaFile: resolve(process.cwd(), 'schema.gql'),
        context: ({ req }) => ({
          ...createWmsLoaders(loaderService),  // per-request DataLoaders
          // your own context fields — fully preserved
          user: req.user,
        }),
      }),
    }),
  ],
})
export class AppModule {}
```

What this registration wires:

- 50 TypeORM entities (material, batch, loader, location, every order kind, change logs, signatures, etc.)
- ~100 GraphQL types
- ~65 queries and mutations
- DataLoader N+1 prevention across every `resolveField` (via the `loaders` key in context)
- Default seed rows (DEFAULT location, DEFAULT loaderType, DEFAULT loader) on first boot

**`forRootAsync` TypeScript signature**:

```ts
WmsModuleGraphqlModule.forRootAsync(
  options: WmsModuleCoreModuleAsyncOptions,
): DynamicModule
```

A single argument — the WMS core module options (seed defaults, async factory). All GraphQL-server concerns (driver, schema file, context factory, plugins) live in your own `GraphQLModule.forRootAsync(...)` next to it.

See [API Reference - wms-module-graphql](./api-reference.md) for the full export catalog including `LoaderService`, `createWmsLoaders`, `LoaderType<T>` and `WmsLoaders`.

### Adding your own resolvers alongside WMS

Your `GraphQLModule.forRootAsync(...)` registration **is** the single workspace-wide GraphQL module — no constraint from `WmsModuleGraphqlModule` (the lib intentionally does **not** call `GraphQLModule.forRoot` internally). Put your resolvers in normal NestJS modules and import them next to `WmsModuleGraphqlModule`:

```ts
// apps/api/src/modules/posts/posts.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from './post.entity';
import { PostResolver } from './post.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([Post])],
  providers: [PostResolver],
})
export class PostsModule {}

// apps/api/src/app/app.module.ts
@Module({
  imports: [
    /* ... TypeOrm, Config, WmsModuleGraphqlModule, GraphQLModule ... */
    PostsModule,   // your sibling module
  ],
})
export class AppModule {}
```

NestJS's GraphQL module discovers every `@Resolver()` class from every imported module via DI and merges them into the **same** schema. So your `Post`/`User` resolvers coexist in one schema with the WMS resolvers automatically — no extra wiring needed.

### 4.3 `.env`

Keep DB credentials in `.env` (and add it to `.gitignore`).

```
WMS_DB_HOST=staging.example.internal
WMS_DB_PORT=5432
WMS_DB_USER=wms_module
WMS_DB_PASS=...
WMS_DB_NAME=wms
WMS_DB_SCHEMA=wms_demo
```

### 4.4 `apps/api/package.json` essentials

```json
{
  "name": "api",
  "scripts": {
    "dev": "ts-node -r tsconfig-paths/register src/main.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/main.js"
  },
  "dependencies": {
    "@apollo/server": "^4.0.0",
    "@as-integrations/express5": "^1.0.0",
    "@nestjs/apollo": "^13.0.0",
    "@nestjs/common": "^11.0.0",
    "@nestjs/config": "^4.0.0",
    "@nestjs/core": "^11.0.0",
    "@nestjs/graphql": "^13.0.0",
    "@nestjs/platform-express": "^11.0.0",
    "@nestjs/typeorm": "^11.0.0",
    "@rytass/wms-module-core": "^0.1.2",
    "@rytass/wms-module-graphql": "^0.1.2",
    "graphql": "^16.0.0",
    "pg": "^8.0.0",
    "reflect-metadata": "^0.2.0",
    "rxjs": "^7.0.0",
    "class-transformer": "^0.5.0",
    "class-validator": "^0.14.0",
    "typeorm": "^0.3.0"
  },
  "devDependencies": {
    "ts-node": "^10.0.0",
    "tsconfig-paths": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

The `@as-integrations/express5` package is required at runtime by `@nestjs/apollo@13` + Express 5; it is listed as a peer of `wms-module-graphql` since `0.1.1`.

> **Apollo Server version**: `@nestjs/apollo@13` currently pairs with **Apollo Server 4** (not 5).
> Use `"@apollo/server": "^4.0.0"`. Apollo Server 5 is a breaking release — the
> `@as-integrations/express5` peer pairing and plugin import paths differ. Installing
> `^5.0.0` will cause hard runtime errors with the current NestJS Apollo adapter.

### 4.5 Sanity check

Start the server and probe the schema:

> **Note**: NestJS's `app.setGlobalPrefix('api')` does **not** apply to the `/graphql`
> endpoint mounted by `@nestjs/apollo`. The GraphQL endpoint is always at `/graphql`,
> not `/api/graphql`, regardless of the global prefix setting.

```bash
pnpm dev
curl -s -X POST http://localhost:7103/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __schema { queryType { name } } }"}'
# -> {"data":{"__schema":{"queryType":{"name":"Query"}}}}

curl -s -X POST http://localhost:7103/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ locations { items { id key } } }"}'
# -> {"data":{"locations":{"items":[{"id":"<uuid>","key":"DEFAULT"}]}}}
```

The `DEFAULT` location/loader/loaderType returned by the second query was seeded by module init using the keys you passed in section 4.2.

---

### 4.6 Version compatibility matrix

Two different questions, so two columns. **Accepted** is what the published
`peerDependencies` allow — a version outside it fails to install. **Tested** is the
combination CI and the integration suite actually run against; anything else is
accepted because nothing in the lib's use of that package is known to break, not
because it was exercised.

| Package                     | Accepted (peer range)     | Tested            | Notes                                                                       |
|-----------------------------|---------------------------|-------------------|-----------------------------------------------------------------------------|
| `@nestjs/common` / `core`   | 10.x – 11.x               | 11.1.x            | **12.x is not accepted**: the whole NestJS 12 line is ESM-only, which this package (dual CJS+ESM) and a webpack-bundled host cannot consume yet |
| `@nestjs/graphql`           | 13.x                      | 13.4.5            | 14.x requires NestJS 12 (ESM-only)                                          |
| `@nestjs/apollo`            | 13.x                      | 13.4.5            | The lib itself imports neither `@nestjs/apollo` nor `@apollo/server`; the peer records that a driver is required |
| `@apollo/server`            | not a peer                | 5.5.1             | Chosen by your driver, not by this package                                   |
| `@as-integrations/express5` | 1.x                       | 1.1.2             | Required runtime peer of the Express driver                                  |
| `graphql`                   | 16.x                      | 16.12.0           | 17.x is blocked upstream — `@apollo/server@5` still peers `^16.11.0`         |
| `rxjs`                      | 7.x                       | 7.8.x             | One import (the mutation interceptor)                                        |
| `@nestjs/event-emitter`     | 2.x – 3.x (optional)      | 3.1.0             | The next release is 12.x, which is ESM-only                                  |
| TypeORM                     | 0.3.x                     | 0.3.28            | 0.2.x not supported (different DataSource API)                              |
| PostgreSQL                  | —                         | 14+               | Native dialect                                                              |
| Node.js                     | —                         | 20 LTS / 22       | 18 deprecated, 24 untested                                                  |
| Next.js                     | 15.x – 16.x               | 15.5.x Pages      | Only `next/router` and `next/navigation` are used; App Router unsupported (see §13.11) |
| React / React DOM           | 18.x – 19.x               | 19.2.x            | No React-19-only API is used, and `@mezzanine-ui/react` peers `>=18`        |
| `@mezzanine-ui/react`       | 1.x                       | 1.4.1             | `@mezzanine-ui/system` is required — 45 of the lib's SCSS files `@use` it   |
| `nuqs`                      | 2.x                       | 2.8.x             | Pages adapter; App Router adapter untested (see §13.11)                     |

> **Why `@apollo/server` v5 is fine.** An earlier release pinned `@nestjs/apollo` to
> `>=13.0.0 <13.2.0`, on the grounds that 13.2+ moved to `@apollo/server@^5` and "the lib
> uses v4 plugin APIs". That was wrong: the only `ApolloServerPluginLandingPageLocalDefault`
> usage lives in this repo's own `apps/api`, never in the published package, which imports
> nothing from `@apollo/server` at all. The pin excluded the very combination the test suite
> runs on, so it has been widened back to `^13.0.0`.

---

## 5. Frontend setup (Next.js Pages Router)

The frontend package targets **Next.js Pages Router**, not App Router. The pre-built page bodies use SSR-incompatible providers and must be loaded on the client.

### 5.1 `apps/client/src/pages/_app.tsx`

Provider chain — order matters.

```tsx
import '@xyflow/react/dist/style.css';      // Map view needs React Flow styles
import '../styles/mezzanine.scss';           // Mezzanine design tokens
import '../styles/global.scss';              // Your global reset
import { type AppProps } from 'next/app';
import Head from 'next/head';
import { ApolloProvider } from '@apollo/client/react';
import CalendarConfigProviderDayjs from '@mezzanine-ui/react/Calendar/CalendarConfigProviderDayjs';
import { NuqsAdapter } from 'nuqs/adapters/next/pages';
import { ApolloClient } from '@rytass/wms-module-react';
import AuthGuard from '../auth/AuthGuard';

function CustomApp({ Component, pageProps }: AppProps): React.ReactNode {
  return (
    <>
      <Head>
        <title>My WMS</title>
      </Head>
      <ApolloProvider client={ApolloClient}>
        <CalendarConfigProviderDayjs>
          <NuqsAdapter>
            <AuthGuard>
              <Component {...pageProps} />
            </AuthGuard>
          </NuqsAdapter>
        </CalendarConfigProviderDayjs>
      </ApolloProvider>
    </>
  );
}

export default CustomApp;
```

Required CSS imports — all three matter:

| Import                            | Why                                                                                                              |
|-----------------------------------|------------------------------------------------------------------------------------------------------------------|
| `@xyflow/react/dist/style.css`    | Maps page and Locations map tab use React Flow. Without this, the canvas controls render unstyled.               |
| `mezzanine.scss`                  | Sets up Mezzanine design tokens and base styles.                                                                 |
| `global.scss`                     | Your own global reset / overrides.                                                                               |

### 5.2 `apps/client/src/styles/mezzanine.scss`

```scss
@use '@mezzanine-ui/core' as mzn-core;
@use '@mezzanine-ui/system' as mzn-system;
@use '@mezzanine-ui/system/spacing';

:root {
  @include mzn-system.common-variables('default');
  @include mzn-system.colors();
}

@include mzn-core.styles();

// Overrides the WMS UI depends on:
.mzn-backdrop.mzn-backdrop--open.mzn-modal__overlay {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  bottom: 0;
}

.mzn-modal--wide {
  width: calc(100% - var(--mzn-spacing-padding-horizontal-spacious) * 2);
}

.mzn-dropdown-popper--with-portal {
  z-index: 1004 !important;
}

.mzn-table__cell__content .mzn-icon {
  vertical-align: sub;
}

.mzn-select,
.mzn-input {
  min-width: unset !important;
}

.mzn-form-field--horizontal .mzn-form-field__label-area {
  min-width: fit-content !important;
}
```

### 5.3 `apps/client/next.config.ts`

```ts
import type { NextConfig } from 'next';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:7103';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Transpile the ESM-only packages
  transpilePackages: [
    '@rytass/wms-module-react',
    '@rytass/wms-map-react-components',
    '@mezzanine-ui/react',
    '@mezzanine-ui/core',
    '@mezzanine-ui/icons',
    '@mezzanine-ui/system',
  ],
  // The default ApolloClient instance hardcodes `/graphql` as the URL.
  // Proxy that to the API server so it actually reaches the backend.
  async rewrites() {
    return [
      {
        source: '/graphql',
        destination: `${API_URL}/graphql`,
      },
    ];
  },
};

export default nextConfig;
```

Why `transpilePackages`: the React package declares `"type": "module"` and Mezzanine UI ships ESM-syntax JS without the flag. Both must run through the Next.js transformer.

`@rytass/wms-map-react-components` is a companion package that provides the warehouse-map
visualization canvas used by the **LocationsManagement** and **Maps** pages (built on React
Flow / `@xyflow/react`). It is a **required runtime dependency** for those two pages; omitting
it causes import errors when those pages load. Like the React lib, it ships ESM-only and must
be listed in `transpilePackages`. Install it as a regular production dependency:

```bash
pnpm add @rytass/wms-map-react-components
```

Current published version: `^0.1.0`. Registry: `https://registry.npmjs.org/`.

### 5.4 `apps/client/package.json` essentials

```json
{
  "name": "client",
  "scripts": {
    "dev": "next dev -p 7101",
    "build": "next build",
    "start": "next start -p 7101"
  },
  "dependencies": {
    "@apollo/client": "^4.0.0",
    "@hookform/error-message": "^2.0.0",
    "@hookform/resolvers": "^5.0.0",
    "@mezzanine-ui/core": "^1.0.0",
    "@mezzanine-ui/icons": "^1.0.0",
    "@mezzanine-ui/react": "^1.0.0",
    "@mezzanine-ui/system": "^1.0.0",
    "@rytass/wms-map-react-components": "^0.1.0",
    "@rytass/wms-module-react": "^0.1.2",
    "@xyflow/react": "^12.0.0",
    "graphql": "^16.0.0",
    "lodash": "^4.17.0",
    "next": "^15.0.0",
    "nuqs": "^2.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-hook-form": "^7.0.0",
    "yup": "^1.0.0"
  }
}
```

---

## 6. Pages Router shell pattern (the 19 thin shells)

The React package exports each functional area as a **default-exportable page body**. The consumer's `pages/<area>/index.tsx` is a 7-12 line shell.

### Static shells (one component, no params)

```tsx
// apps/client/src/pages/materials-management/index.tsx
import { MaterialsManagement } from '@rytass/wms-module-react';
import { type ReactNode } from 'react';

function MaterialsManagementPage(): ReactNode {
  return <MaterialsManagement />;
}

export const getServerSideProps = async () => {
  return { props: {} };
};

export default MaterialsManagementPage;
```

Required shells — one per route:

| Route                          | Component                  | Source           |
|--------------------------------|----------------------------|------------------|
| `/materials-management`        | `<MaterialsManagement />`  | wms-module-react |
| `/loaders-management`          | `<LoadersManagement />`    | wms-module-react |
| `/loaders-management/create`   | `<CreateLoader />`         | wms-module-react |
| `/locations-management`        | `<LocationsManagement />`  | wms-module-react |
| `/inventory-list`              | `<InventoryList />`        | wms-module-react |
| `/inventory-count`             | `<InventoryCount />`       | wms-module-react |
| `/inventory-movement`          | `<InventoryMovement />`    | wms-module-react |
| `/change-history`              | `<ChangeHistory />`        | wms-module-react |
| `/receive-inventory-orders`    | `<ReceiveInventoryOrders />`| wms-module-react|
| `/ship-inventory-orders`       | `<ShipInventoryOrders />`  | wms-module-react |
| `/label-search`                | `<LabelSearch />`          | wms-module-react |
| `/maps`                        | `<Maps />`                 | wms-module-react |

### Dynamic shells (one route param)

The dynamic page components read `useRouter().query.id` internally — the consumer does not pass props.

```tsx
// apps/client/src/pages/receive-inventory-orders/[id]/view.tsx
import { ViewReceiveInventoryOrder } from '@rytass/wms-module-react';
import { type ReactNode } from 'react';

function ReceiveInventoryOrderViewPage(): ReactNode {
  return <ViewReceiveInventoryOrder />;
}

export const getServerSideProps = async () => {
  return { props: {} };
};

export default ReceiveInventoryOrderViewPage;
```

| Route                                          | Component                       |
|------------------------------------------------|---------------------------------|
| `/receive-inventory-orders/[id]/view`          | `<ViewReceiveInventoryOrder />` |
| `/receive-inventory-orders/[id]/edit`          | `<EditReceiveInventoryOrder />` |
| `/ship-inventory-orders/[id]/view`             | `<ViewShipInventoryOrder />`    |
| `/ship-inventory-orders/[id]/edit`             | `<EditShipInventoryOrder />`    |
| `/inventory-movement/transfer-order/[id]`      | `<EditTransferOrder />`         |

### Home page

The lib does not ship a dashboard. Provide your own or render nothing:

```tsx
// apps/client/src/pages/index.tsx
import { type ReactNode } from 'react';

function IndexPage(): ReactNode {
  return null; // Or your own landing page
}

export default IndexPage;
```

---

## 7. Apollo client wiring

### 7.1 Default `ApolloClient` instance (simple case)

The lib re-exports a configured Apollo client instance for fast wiring:

```ts
import { ApolloClient } from '@rytass/wms-module-react';

// Use directly in ApolloProvider:
<ApolloProvider client={ApolloClient}>...</ApolloProvider>
```

**Important caveat**: the default instance points at the relative URL `/graphql`. For this to reach the NestJS backend, the Next.js dev server must proxy `/graphql` to the API host. See the `rewrites()` in section 5.3.

In production, set `NEXT_PUBLIC_API_URL` to the public API origin so `next.config.ts` proxies to the right place.

### 7.2 Factory pattern (recommended for custom URLs)

If you need to talk to multiple GraphQL endpoints, override the URL, add headers, or compose links, use the `createApolloClient` factory:

```ts
import { createApolloClient } from '@rytass/wms-module-react';

const client = createApolloClient();
```

As of **0.1.2**, `createApolloClient()` takes **no parameters** and returns a fresh
`ApolloClient<NormalizedCacheObject>` instance configured with the same `/graphql` URI as
the default singleton. A URL/header override parameter is planned for **0.2.0** (will be a
non-breaking addition). See [API Reference - createApolloClient](./api-reference.md).

### 7.3 GraphQL operations & DocumentNode constants

All queries and mutations the lib pages need are pre-defined and pre-typed and exported from
`@rytass/wms-module-react`. You can import them directly to build custom pages on top of the
same data layer.

> **Codegen strategy**: the lib uses the `typed-document-node` GraphQL Code Generator plugin,
> which generates `DocumentNode` constants (e.g. `MaterialsDocument`) plus paired TypeScript
> types — **not** React hook wrappers. Call `useQuery`/`useMutation` from `@apollo/client/react`
> and pass the `Document` constant as the first argument.

**Query example:**

```ts
import { useQuery } from '@apollo/client/react';
import {
  MaterialsDocument,
  type MaterialsQuery,
  type MaterialsQueryVariables,
} from '@rytass/wms-module-react';

function MyCustomMaterialList(): ReactNode {
  const { data, loading } = useQuery<MaterialsQuery, MaterialsQueryVariables>(
    MaterialsDocument,
    { variables: { offset: 0, limit: 20 } },
  );

  if (loading) return <Loading />;
  return <ul>{data?.materials.items.map((m) => <li key={m.id}>{m.name}</li>)}</ul>;
}
```

**Paginated query example:**

```ts
import { useQuery } from '@apollo/client/react';
import {
  LocationsDocument,
  type LocationsQuery,
  type LocationsQueryVariables,
} from '@rytass/wms-module-react';

function MyLocationPicker(): ReactNode {
  const { data } = useQuery<LocationsQuery, LocationsQueryVariables>(LocationsDocument, {
    variables: { offset: 0, limit: 100 },
  });
  const locations = data?.locations.items ?? [];
  // ...
}
```

**Mutation example:**

```ts
import { useMutation } from '@apollo/client/react';
import {
  CreateMaterialDocument,
  type CreateMaterialMutation,
  type CreateMaterialMutationVariables,
} from '@rytass/wms-module-react';

function CreateMaterialButton(): ReactNode {
  const [createMaterial, { loading }] = useMutation<
    CreateMaterialMutation,
    CreateMaterialMutationVariables
  >(CreateMaterialDocument);

  const handleCreate = (): void => {
    createMaterial({ variables: { name: 'Steel Bolt', description: 'M8' } });
  };

  return <button onClick={handleCreate} disabled={loading}>Create</button>;
}
```

The full list of generated `Document` constants and their types is in
[API Reference - Generated GraphQL Operations](./api-reference.md).

---

## 8. Authentication, authorization & events

The lib ships **no frontend auth** — the page components assume they render in an authenticated context and call queries on mount without checking session state. On the **backend**, `@rytass/wms-module-graphql` ships an *opt-in, host-neutral authorization protocol* you wire to your own permission system (member-base / Casbin / JWT / anything). See [§8.5 Backend authorization](#85-backend-authorization-resolver-level).

### 8.1 Stub for demos

The minimum wrapper that lets the lib run unauthenticated:

```tsx
// apps/client/src/auth/AuthGuard.tsx
import dynamic from 'next/dynamic';
import { type ReactNode } from 'react';

const AuthorizedAdminPage = dynamic(() => import('./AuthorizedAdminPage'), {
  ssr: false,
});

interface AuthGuardProps {
  children: ReactNode;
}

function AuthGuard({ children }: AuthGuardProps): ReactNode {
  return <AuthorizedAdminPage>{children}</AuthorizedAdminPage>;
}

export default AuthGuard;
```

The `ssr: false` matters — the lib's providers contain client-only state (Mezzanine portal refs, Apollo subscriptions) that breaks SSR hydration if rendered server-side.

### 8.2 Layout shell with the lib's providers

`AuthorizedAdminPage` wraps the lib's three context providers and the navigation chrome:

```tsx
// apps/client/src/auth/AuthorizedAdminPage/index.tsx
import { type ReactNode } from 'react';
import Main from './Main';
import {
  DialogProvider,
  InventoryActionsProvider,
  ModalProvider,
} from '@rytass/wms-module-react';

interface AuthorizedAdminPageProps {
  children: ReactNode;
}

function AuthorizedAdminPage({ children }: AuthorizedAdminPageProps): ReactNode {
  return (
    <InventoryActionsProvider>
      <DialogProvider>
        <ModalProvider>
          <Main>{children}</Main>
        </ModalProvider>
      </DialogProvider>
    </InventoryActionsProvider>
  );
}

export default AuthorizedAdminPage;
```

All three providers come from the lib. They wire up cross-component modal/dialog state that the page components rely on. **Order is significant** — `InventoryActionsProvider` must wrap the dialog/modal providers because some inventory actions trigger dialogs.

### 8.3 Navigation

The reference implementation's Navigation component uses `useRoutes()` from the lib to enumerate the menu structure:

```tsx
// apps/client/src/auth/AuthorizedAdminPage/Navigation.tsx (excerpt)
import { useRoutes } from '@rytass/wms-module-react';
import { Navigation as MznNavigation } from '@mezzanine-ui/react';

function Navigation(): ReactNode {
  const routes = useRoutes(); // returns the full RouteConfig tree
  // ... render MznNavigation with routes
}
```

`useRoutes()` returns a typed tree of `{ title, icon, href, children }` — keep that shape, render however you want. The reference implementation is 79 lines.

### 8.4 Real auth integration

Replace the `AuthGuard` stub with your own logic that:

1. Verifies session before rendering `AuthorizedAdminPage`.
2. Provides member identity to GraphQL via the Apollo client's `context` link.
3. Handles 401 responses (logout / redirect).

### 8.5 Backend authorization (resolver-level)

> 📖 This is the condensed version. The full design — execution order, member-base / custom-JWT / no-guard recipes, the single coupling point, the exported API, and a troubleshooting FAQ — lives in [**`docs/authorization.md`**](./authorization.md).

Every WMS root `@Query` / `@Mutation` is annotated with `@WmsOperation({ resource, action })` — a host-neutral permission requirement. The library enforces it through its own route-level `WmsAuthGuard`, which delegates the actual allow/deny decision to an `authChecker` **you** supply at module registration. The library never imports your auth system; you map WMS's `resource`/`action` onto whatever your system understands.

> ⚠️ **The global-guard pitfall.** A deny-by-default global guard — e.g. the `CasbinGuard` that `@rytass/member-base-nestjs-module` registers as `APP_GUARD` — blankets *every* resolver in the compiled schema, including WMS's. Because WMS resolvers carry no host-specific permission metadata, such a guard rejects them all ("every WMS query/mutation is forbidden"). WMS solves this by stamping each operation with a host-skip marker (default: member-base's `IS_ROUTE_PUBLIC`) so the global guard defers, while `WmsAuthGuard` does the real enforcement. **You do not need to touch your global guard.**

#### Wire it up (member-base / Casbin)

```ts
// app.module.ts
import { WmsModuleGraphqlModule } from '@rytass/wms-module-graphql';
import { createMemberBaseWmsAuthChecker } from '@rytass/wms-module-graphql/adapters/member-base';

WmsModuleGraphqlModule.forRootAsync({
  // ...existing core options (defaultLoaderSerialId, useFactory, etc.)...
  authChecker: createMemberBaseWmsAuthChecker({
    // Map WMS resource/action onto your Casbin [subject, action] tuples.
    // Return multiple tuples to mean "allow if ANY passes" (OR semantics).
    map: ({ resource, action }) => [[`wms:${resource}`, action]],
    //  e.g. material:read -> enforce(memberId, domain, 'wms:material', 'read')
  }),
});
```

The member-base adapter reuses everything `CasbinGuard` already prepared on the request (the verified `payload`, the `enforcer`, and your possibly-customized `casbinPermissionChecker`), so WMS enforces with the **exact same** policy engine as your own resolvers — with zero member-base import on the WMS side. Requirement: keep member-base's global guard enabled (default) and expose the request on the GraphQL context as `req` (Apollo's default).

#### Other auth systems

`authChecker` is a plain function — `(execContext, { resource, action }) => boolean | Promise<boolean>`. For JWT/RBAC without Casbin, read your session off the `ExecutionContext` and decide there. If your global guard uses a different "public/skip" metadata key than member-base's `IS_ROUTE_PUBLIC`, change the single `HOST_SKIP_METADATA_KEY` constant in `libs/graphql/src/lib/auth/host-skip.constant.ts`.

#### No global guard at all

If you omit `authChecker`, the module stays fully permissive (handy for local dev). If you protect your own resolvers with explicit `@UseGuards(...)` instead of a global `APP_GUARD`, the host-skip marker is simply inert and WMS still self-enforces through `authChecker`.

The WMS `resource`/`action` strings are **internal metadata only** — they are not part of the GraphQL schema, so refining them later is not a breaking change for GraphQL consumers (it only affects your `map`).

---

### 8.6 Mutation events & hooks

> 📖 Condensed version. The full design, the complete list of 38 operation + 18 stock domain events, payloads, and limitations live in [**`docs/events.md`**](./events.md).

Every WMS mutation can be **intervened in** and **observed** through two opt-in hook points wired on the same `WmsModuleGraphqlModule.forRootAsync({ ... })` call as everything else:

- **`beforeHooks`** run *before any DB work* — `throw` to **veto** the mutation (zero side effects).
- **`afterListeners`** run *after the outermost transaction commits* — you are never notified about a rolled-back change.

```ts
// apps/api/src/app/app.module.ts
import { ForbiddenException } from '@nestjs/common';
import { WmsModuleGraphqlModule } from '@rytass/wms-module-graphql';
import { memberBaseActorExtractor } from '@rytass/wms-module-graphql/adapters/member-base';

WmsModuleGraphqlModule.forRootAsync({
  // ...the same core options as §4.2 (defaultLoaderSerialId, useFactory, etc.)...

  // (v2) extract actor from the request: memberBaseActorExtractor reads
  //      req.payload → { id, domain } (the same JWT payload CasbinGuard uses)
  actorExtractor: memberBaseActorExtractor,

  // (v2) append materialId/batchId/locationId/loaderId to stock event payloads
  //      via a single indexed PK lookup per event, inside the same transaction
  enrichStockEvents: true,

  beforeHooks: {
    // intent payload = the raw GraphQL args; v2 also receives actor
    'ship-inventory-order.shipped': async ({ args, actor, executionContext }) => {
      if (!(await canShip(args, actor, executionContext))) {
        throw new ForbiddenException('shipment blocked');
      }
    },
  },

  afterListeners: {
    // operation event — fires once per mutation, with the result
    // v2: payload also carries args (the items[] input) and actor
    'ship-inventory-order.shipped': async ({ payload }) => {
      await erp.markShipped(payload.id, payload.result, payload.actor);
    },
    // stock domain event — fires once per affected item (post-commit)
    // v2 with enrichStockEvents: materialId/batchId/locationId/loaderId also present
    'stock.allocated': async ({ payload }) => {
      await erp.reserve(payload.orderId, payload.itemId, payload.quantityDelta);
    },
  },
});
```

Two tiers of events you can listen to:

- **Operation events** — one per mutation: `material.created`, `receive-inventory-order.received`, `ship-inventory-order.shipped`, … (38 total). v1 payload: `{ id, result }`. v2 payload: `{ id, result, args, actor }`.
- **Stock domain events** — driven by the `ChangeType` state machine: `stock.allocated`, `stock.shipped`, `stock.held`, … (18 total). Payload: `{ orderId, itemId, quantityDelta, changeType, inspectionResult? }`. `orderId` matches the operation event's `id`, so you can correlate the two tiers. With `enrichStockEvents: true` the payload also carries `materialId?`, `batchId?`, `locationId?`, `loaderId?`.

Both maps are fully typed — the payload is inferred from the event-name key. With neither configured, the interceptor passes through with **zero overhead** (no behaviour change).

#### v2: The 9 boolean action events

Nine mutations — `received`, `deallocated`, `released`, `shipped`, `ship-cancelled`,
`transferred`, `transfer-cancelled`, customer/vendor `returned` — return `boolean` and
cannot carry a richer `result` without a breaking GraphQL schema change. For subscribers,
the full signal comes from **`payload.args`** (the exact items input) and the **stock events
they fan out** (one per affected item). The operation event confirms success; `args` carries
the intent.

> ⚠️ **`enrichStockEvents` partial coverage**: split / merge / reclassify order-items have
> **no `materialId` / `batchId`** at the item level (these domains keep that metadata on the
> parent order). With `enrichStockEvents: true`, `stock.splitted`, `stock.merged`, and
> `stock.reclassified` only receive `locationId` / `loaderId` — look up `materialId` /
> `batchId` from the parent order by `orderId` if you need them.

#### Optional: `@OnEvent` via `@nestjs/event-emitter`

Prefer decoupled subscribers? Install `@nestjs/event-emitter` (an optional peer dependency) and opt into the bridge — every event is then also emitted as `wms.<event-name>`:

```ts
import { EventEmitterModule } from '@nestjs/event-emitter';
import { wmsEventEmitterBridgeProvider } from '@rytass/wms-module-graphql/adapters/event-emitter';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    WmsModuleGraphqlModule.forRootAsync({
      ...coreOptions,
      actorExtractor: memberBaseActorExtractor,   // v2 — optional
      enrichStockEvents: true,                    // v2 — optional
      eventEmitterBridge: wmsEventEmitterBridgeProvider,
    }),
  ],
})
export class AppModule {}

// elsewhere
@Injectable()
class StockSync {
  @OnEvent('wms.stock.allocated')
  handle(payload: WmsStockEventPayload) { /* ... */ }
}
```

The bridge is the only thing that imports `@nestjs/event-emitter`, so it stays an entirely optional dependency — the core module never requires it. `afterListeners` and the bridge can be used together.

> ⚠️ Delivery is **in-process and post-commit**, not a durable outbox: if the process crashes after commit but before dispatch, those events are lost. See [`docs/events.md` §7](./events.md#7-guarantees--limitations) for the full guarantees.

---

## 9. Database support matrix

| Database   | Status        | Notes                              |
|------------|---------------|------------------------------------|
| PostgreSQL | Recommended   | Native dialect of the entities     |
| SQLite     | Limited       | See known issues below             |

### PostgreSQL (recommended)

The entities are designed for PostgreSQL:

- `timestamptz` columns map to native `timestamp with time zone`
- `bool` maps to PG `boolean`
- Sequence-based serial IDs (e.g. loader.serialId) use PG `CURRVAL`
- `synchronize: true` works for dev/demo; use proper migrations in production

This is the only database where the lib runs without any consumer-side workaround.

### SQLite limitations

If you must run against SQLite (e.g. for local prototyping without a PG server):

1. **`timestamptz` / `bool` column types** — TypeORM's `EntityMetadataValidator` rejects these for the SQLite driver. The consumer must patch the validator's `supportedDataTypes` allowlist, e.g.:

   ```ts
   import { AbstractSqliteDriver } from 'typeorm/driver/sqlite-abstract/AbstractSqliteDriver';
   AbstractSqliteDriver.prototype.supportedDataTypes.push('timestamptz', 'bool');
   ```

   At the disk layer SQLite is liberal — it accepts any column type string and gives it NUMERIC affinity — so once the validator is past, schema creation works.

2. **`CURRVAL(seq_name)` PostgreSQL function** — used internally to compute loader serial IDs. SQLite has no equivalent. All `createLoader` mutations will fail with `no such function: CURRVAL`. There is no clean consumer-side workaround; running real loader creation flows on SQLite is not supported as of 0.1.2.

3. **DateTime serialize round-trip** — SQLite returns datetime strings in `YYYY-MM-DD HH:MM:SS` format. The GraphQL DateTime scalar may emit `null` for some columns; the consumer-visible effect is blank `createdAt` fields in some payloads.

**Recommendation**: use PostgreSQL. If you absolutely need SQLite for offline demos, drop the `createLoader` flow from your test plan or wait for a future release with driver-agnostic ID generation.

---

## 10. Seed data for demos

The lib seeds three rows on first boot (`DEFAULT` location, loaderType, loader). Beyond that, the consumer is responsible for any demo data.

The cleanest approach is a small fetch-based script that POSTs against the local GraphQL endpoint. Seeding via the GraphQL surface also doubles as a smoke test of every mutation.

```js
// scripts/seed.mjs (ESM, no build step)
const GQL_URL = 'http://localhost:7103/graphql';

async function gql(query, variables = {}) {
  const res = await fetch(GQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors.map((e) => e.message).join('; '));
  return json.data;
}

const { createLocation } = await gql(`
  mutation {
    createLocation(key: "ZONE-A", description: "A 區") {
      id key description
    }
  }
`);
console.log('Created location:', createLocation.id);
```

The reference implementation's full seed script (`scripts/seed.mjs`, 286 lines) seeds 3 materials × units, 2 loaderTypes, 5 loaders, 2 locations, and 1 completed receive order with items — enough to exercise every list page with meaningful data.

---

## 11. Deployment notes

### 11.1 API server

The NestJS API can deploy to any platform that supports Node.js 20:

- Containerize with multi-stage build (see the reference repo's `Dockerfile` pattern)
- Set `WMS_DB_*` env vars in the deployment environment
- Disable `synchronize: true` in production; use TypeORM migrations
- The default port is 7103 (overridable via `PORT`)

### 11.2 Frontend

The Next.js Pages Router app builds to `next start` output:

- Set `NEXT_PUBLIC_API_URL` to the public API origin so the `next.config.ts` proxy rewrites `/graphql` correctly
- The lib targets ES2022 — modern browsers only
- The `transpilePackages` list is required at build time, not just dev

### 11.3 Standalone Next.js output (optional)

The lib does not require any special Next.js output mode. If your deployment platform benefits from `output: 'standalone'` (smaller Docker images), enable it in `next.config.ts`:

```ts
const nextConfig: NextConfig = {
  output: 'standalone',
  // ...
};
```

This is what the original WMS monorepo uses for its client deployment.

---

## 12. Known issues & roadmap

Cosmetic warnings (do not affect functionality):

- React Flow logs *"It looks like you've created a new nodeTypes object"* — internal lib optimization issue, no functional impact.
- Loader-create form numeric inputs warn about `undefined` values — minor UX cleanup.
- `MznModal` aria-hidden interaction has a known accessibility nit (Mezzanine UI issue).

Functional limitations:

- **Apollo endpoint is hardcoded** in the default `ApolloClient` instance (`/graphql`). The Next.js rewrite is the supported workaround. A future minor will widen `createApolloClient` to accept a URL parameter (breaking change -> 0.2.0).
- **SQLite support is partial** — see section 9. Driver-agnostic loader serial IDs are on the roadmap.

Tracked in this repo — see `libs/core/CHANGELOG.md`, `libs/graphql/CHANGELOG.md`, `libs/react/CHANGELOG.md` and `RELEASING.md` for cadence.

---

---

## 13. Integrating into an existing NestJS / Next.js project

This section covers the real-world scenarios where the WMS modules are added to a project
that already has its own NestJS backend, GraphQL setup, or Next.js frontend. The greenfield
setup in sections 4-7 is the baseline; read this section for the delta.

> **Scope**: 0.3.0+. Earlier 0.1.x / 0.2.0 limitations around `GraphQLModule` co-existence have
> been removed by the user-driven composition refactor — see §13.1.

### 13.1 Coexisting with an existing `GraphQLModule`

**Status**: Fully supported since 0.3.0.

`WmsModuleGraphqlModule.forRootAsync(...)` only registers providers (resolvers, `LoaderService`,
core module) — it does **not** call `GraphQLModule.forRoot` internally. The host application
registers a **single** `GraphQLModule.forRootAsync(...)` of its own. NestJS's schema builder
walks the DI container at boot, collects every `@Resolver()` class from every imported module,
and merges them into one schema.

This means a host app with an existing GraphQL server just adds `WmsModuleGraphqlModule` next to
its existing `GraphQLModule.forRootAsync(...)`. To preserve N+1 prevention for the WMS resolvers,
the host must inject `LoaderService` into its own context factory and call `createWmsLoaders(...)`
per request:

```ts
import {
  WmsModuleGraphqlModule,
  LoaderService,
  createWmsLoaders,
} from '@rytass/wms-module-graphql';

@Module({
  imports: [
    // ... your existing modules ...
    WmsModuleGraphqlModule.forRootAsync({
      useFactory: async () => ({}),
      defaultLoaderSerialId: 'DEFAULT',
      defaultLoaderTypeKey: 'DEFAULT',
      defaultLocationKey: 'DEFAULT',
    }),
    GraphQLModule.forRootAsync({
      driver: ApolloDriver,
      inject: [LoaderService, /* your existing deps */],
      useFactory: (loaderService: LoaderService /* , ... */) => ({
        autoSchemaFile: 'schema.gql',
        context: ({ req }) => ({
          ...createWmsLoaders(loaderService),   // WMS DataLoader trio
          user: req.user,                       // your existing context fields
          // ... any other context shape you already had ...
        }),
      }),
    }),
  ],
})
export class AppModule {}
```

**Type name conflicts**: still a separate concern — see §13.14. The shared-schema model means
your `type Material`, `type Location`, etc. must not collide with the WMS counterparts.

---

### 13.2 Sharing a TypeORM DataSource

`WmsModuleCoreModule` (loaded automatically by `WmsModuleGraphqlModule`) calls
`TypeOrmModule.forFeature(entities)` using the **default** TypeORM data source connection.
It does not create a named connection.

**Implications:**

- If your host app uses `TypeOrmModule.forRoot(...)` with the default connection name (`default`),
  the WMS entities will register against the same data source — this is correct behavior and
  works as-is. The `autoLoadEntities: true` flag handles entity discovery.

- If your host uses a **named connection** (e.g. `TypeOrmModule.forRoot({ name: 'main', ... })`),
  the WMS entities will attempt to register against the unnamed default connection, which will
  not exist. You must provide a default connection alongside your named connection, or fork the
  lib to pass a connection name through `forRootAsync`.

**Schema isolation**: the WMS entities use no table prefix by default. If your database already
has tables named `material`, `loader`, `location`, `stock`, etc. you will get name collisions.
Use a dedicated PostgreSQL schema (the `schema` option in `TypeOrmModuleOptions`) to isolate
WMS tables:

```ts
TypeOrmModule.forRoot({
  // ...
  schema: 'wms',       // All WMS entities create tables in the 'wms' schema
  autoLoadEntities: true,
});
```

This is what `wms-standalone` does (`WMS_DB_SCHEMA=wms_demo`).

---

### 13.3 Entity / Table Name Conflicts

The WMS TypeORM entities use unqualified class names as table names (TypeORM default).
If your host application already defines entities named `Material`, `Location`, `Loader`,
`Stock`, `Batch`, `SaleOrder`, or any of the 50 WMS entity names, you will get either a
TypeORM registration conflict or unexpected data sharing.

**Fix**: use a dedicated PostgreSQL schema (see §13.2 above). If you cannot use a separate
schema, you must fork `libs/core` and add a table-name prefix to every entity decorator,
e.g. `@Entity('wms_material')`.

---

### 13.4 Production Database Migrations

`synchronize: true` is for development only. In production:

1. Disable `synchronize`:

```ts
TypeOrmModule.forRoot({
  // ...
  synchronize: false,
});
```

2. To generate migrations that include WMS entities, TypeORM's `migration:generate` CLI needs
   access to all entity classes. Since WMS entities are bundled inside `@rytass/wms-module-core`,
   you need to import them in your TypeORM data source config:

```ts
// data-source.ts (TypeORM CLI config)
import { DataSource } from 'typeorm';
// Import all entity classes from the core lib
// (see docs/api-reference.md "TypeORM Entities" for the complete list of 50 classes)
import {
  MaterialEntityClass,
  LoadersEntityClass,
  LocationEntityClass,
  // ... all entity classes from @rytass/wms-module-core
} from '@rytass/wms-module-core';
// WarehouseMapEntityClass lives in the base module, not in core
import { WarehouseMapEntityClass } from '@rytass/wms-base-nestjs-module/models/warehouse-map.entity';

export default new DataSource({
  type: 'postgres',
  // ... connection config
  entities: [
    MaterialEntityClass,
    LoadersEntityClass,
    LocationEntityClass,
    // ... list every entity class from @rytass/wms-module-core
    WarehouseMapEntityClass, // required — used by LocationsManagement and Maps pages
    // Add your own entity classes here
  ],
  migrations: ['src/migrations/*.ts'],
});
```

> **Note**: `WarehouseMapEntityClass` is imported from `@rytass/wms-base-nestjs-module`, not
> from `@rytass/wms-module-core`. If it is omitted, the `warehouse_map` table is never
> created; the `LocationsManagement` and `Maps` pages will throw at runtime trying to query
> a non-existent table. Install `@rytass/wms-base-nestjs-module` as an additional dependency
> if it is not already in your `package.json`.
>
> For the full list of the 50+ entity classes exported from `@rytass/wms-module-core`, refer
> to the **TypeORM Entities** section in [docs/api-reference.md](./api-reference.md).

3. Run `npx typeorm migration:generate src/migrations/wms-init -d data-source.ts`.

The lib does **not** ship migration files. The first time you deploy with `synchronize: false`,
you must generate and run an initial migration that creates all WMS tables.

---

### 13.5 Passing Host Auth Identity into WMS Resolvers

The WMS lib resolvers do **not** enforce auth themselves — they execute queries against the
database without any identity check. RBAC must be layered on top.

**Option A**: NestJS-level global guard. Apply a guard globally in your `AppModule`:

```ts
// app.module.ts
import { APP_GUARD } from '@nestjs/core';
import { YourAuthGuard } from './auth/auth.guard';

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: YourAuthGuard,
    },
  ],
})
export class AppModule {}
```

This applies your guard to every resolver, including WMS resolvers.

**Option B**: Surface the authenticated user through your **own** GraphQL context factory. Since 0.3.0 you own the entire `GraphQLModule.forRootAsync(...)` registration, including `context`. Both `context.user` (returned directly from your factory) and `context.req.user` (set by a guard / Passport on Express) work — pick whichever your resolvers prefer:

```ts
GraphQLModule.forRootAsync({
  driver: ApolloDriver,
  inject: [LoaderService],
  useFactory: (loaderService: LoaderService) => ({
    autoSchemaFile: 'schema.gql',
    context: ({ req }) => ({
      ...createWmsLoaders(loaderService),  // WMS DataLoader trio
      user: req.user,                      // directly accessible as ctx.user
      // ...any other fields you want on context
    }),
  }),
})
```

| Approach                                                | Works? |
|---------------------------------------------------------|--------|
| Return `context: () => ({ user, ...createWmsLoaders(svc) })` | ✅ user fully controls context |
| Populate `req.user` via NestJS guard / Passport             | ✅ access via `context.req.user`  |

> **0.1.x behavior gone**: earlier releases of this lib silently replaced any `context` factory
> you supplied because `WmsModuleGraphqlModule` registered Apollo Server itself. Since 0.3.0,
> the lib only exposes providers and your `GraphQLModule.forRootAsync(...)` is the single
> registration — there is no internal override anymore.

To access the authenticated user in a **custom** resolver, either read it directly from `ctx.user` (if you put it there in your factory) or from `ctx.req.user` (if a guard set it on the request):

```ts
// auth.guard.ts — populate req.user before the resolver runs
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(executionContext: ExecutionContext): boolean {
    const ctx = GqlExecutionContext.create(executionContext);
    const req = ctx.getContext<{ req: Request }>().req;
    // Verify JWT and populate req.user — throw UnauthorizedException if invalid
    (req as Request & { user?: unknown }).user = verifyToken(
      req.headers['authorization'],
    );
    return true;
  }
}

// my.resolver.ts — read req.user from the GraphQL context
import { Resolver, Query, Context } from '@nestjs/graphql';
import { Request, Response } from 'express';

interface GqlContext {
  req: Request & { user?: { id: string; roles: string[] } };
  res: Response;
  loaders: Record<string, unknown>;
}

@Resolver()
export class MyResolver {
  @Query(() => String)
  whoAmI(@Context() ctx: GqlContext): string {
    return ctx.req.user?.id ?? 'anonymous';
  }
}
```

The built-in WMS lib resolvers do not read `req.user` — they execute without any identity
check. Use **Option A** (global `APP_GUARD`) to enforce auth on WMS resolvers.

---

### 13.6 Apollo Client Coexistence — Using Your Host ApolloProvider

If your host Next.js app already has an `<ApolloProvider>`, you can use it for WMS page
components. The WMS page components call `useQuery`/`useMutation` from `@apollo/client/react`
internally, which reads the **nearest** `ApolloProvider` in the React tree.

**Recommended approach: separate `<ApolloProvider>` wrapping WMS routes only**

This is the only reliably correct approach. WMS page components issue `useQuery` calls
internally — there is no mechanism in the lib to tag those operations with a custom context
that a split-link predicate could test. A shared client with a split link will never route
WMS operations to the WMS endpoint.

Create a dedicated Apollo client pointing at the WMS API and wrap only the WMS routes with
it:

```tsx
// apollo-clients.ts
import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';

export const hostApolloClient = new ApolloClient({
  link: new HttpLink({ uri: '/api/graphql' }),
  cache: new InMemoryCache(),
});

export const wmsApolloClient = new ApolloClient({
  link: new HttpLink({ uri: 'http://wms-api.internal/graphql' }),
  cache: new InMemoryCache(),
});
```

```tsx
// In your routing layer (e.g. _app.tsx or a layout component):
import { ApolloProvider } from '@apollo/client/react';
import { hostApolloClient, wmsApolloClient } from './apollo-clients';

function App({ Component, pageProps }: AppProps) {
  const isWmsRoute = router.pathname.startsWith('/wms');

  return (
    <ApolloProvider client={hostApolloClient}>
      {/* host routes use hostApolloClient via context */}

      {isWmsRoute ? (
        // WMS routes get their own provider — useQuery inside WMS components
        // picks up wmsApolloClient from the nearest ApolloProvider
        <ApolloProvider client={wmsApolloClient}>
          <Component {...pageProps} />
        </ApolloProvider>
      ) : (
        <Component {...pageProps} />
      )}
    </ApolloProvider>
  );
}
```

**Why split-link does not work for WMS pages**: a split-link predicate runs per operation
and tests `operation.getContext()`. WMS page components call `useQuery(SomeDocument, vars)`
without setting any operation context. The predicate `(op) => op.getContext().client === 'wms'`
is always `false` for WMS operations. Split-link is only viable if you fork the lib and add
an Apollo link that injects context into every WMS query — not recommended.

---

### 13.7 Inserting the WMS Provider Chain into an Existing `_app.tsx`

The three WMS providers (`InventoryActionsProvider`, `DialogProvider`, `ModalProvider`) need
to wrap all WMS page components. In an existing `_app.tsx`, add them inside your existing
provider stack. **Order is significant** — `InventoryActionsProvider` must be the outermost
of the three:

```tsx
// Existing _app.tsx — add WMS providers around the relevant subtree
import {
  DialogProvider,
  ModalProvider,
  InventoryActionsProvider,
} from '@rytass/wms-module-react';

function App({ Component, pageProps }: AppProps): ReactNode {
  return (
    <YourExistingProviders>
      {/* WMS provider chain — only needed for WMS routes */}
      <InventoryActionsProvider>
        <DialogProvider>
          <ModalProvider>
            <Component {...pageProps} />
          </ModalProvider>
        </DialogProvider>
      </InventoryActionsProvider>
    </YourExistingProviders>
  );
}
```

**Z-index and portal considerations**: `DialogProvider` and `ModalProvider` use Mezzanine UI
portals that render at the document body. If your host app has modals or overlays with high
`z-index` values, WMS dialogs may appear behind them. The `mezzanine.scss` overrides in §5.2
set `.mzn-dropdown-popper--with-portal { z-index: 1004 !important }` — adjust these values
to fit your host app's z-index scale.

---

### 13.8 Using `useRoutes()` with Your Own Navigation

`useRoutes()` returns the full WMS navigation tree as a plain data structure. You do not need
to use the reference `Navigation.tsx` component (which uses Mezzanine UI's `<Navigation>`).
You can render the route tree with any navigation component:

```tsx
import { useRoutes } from '@rytass/wms-module-react';
import { YourSidebar } from '../components/YourSidebar';

// The route tree has two shapes:
//   - Leaf route:  { title: string; href: NextPath; children?: undefined }
//   - Group node:  { title: string; href?: undefined; children: LeafRoute[] }
// Top-level entries like "庫存查詢" are groups with no href — only their
// children have navigable hrefs.

function WmsLayout({ children }: { children: ReactNode }): ReactNode {
  const routes = useRoutes();

  const navItems = routes.flatMap((r) => {
    if (r.children) {
      // Group node — render a section header + child links
      return [
        { label: r.title, href: undefined, isGroup: true as const },
        ...r.children.map((c) => ({ label: c.title, href: c.href, isGroup: false as const })),
      ];
    }
    // Leaf route
    return [{ label: r.title, href: r.href, isGroup: false as const }];
  });

  return (
    <div>
      <YourSidebar items={navItems} />
      <main>{children}</main>
    </div>
  );
}
```

> **Critical constraint**: WMS page components use the `NextPath` enum for all internal
> navigation (`router.push(NextPath.MATERIALSMANAGEMENT)` etc.). Enum values are hardcoded
> root-level paths (`/materials-management`, `/inventory-list`, etc.). **WMS pages cannot be
> mounted under a custom path prefix like `/wms/*`** — internal links will break even though
> the pages initially render. If your existing project requires path prefixing, you must mount
> WMS at the root of a separate domain or subdomain.

The lib's page components do not require the WMS navigation shell to be present — they only
require the three providers (§13.7) and an Apollo client (§13.6). You can completely replace
the navigation chrome with your own.

---

### 13.9 i18n: Current Limitations and Workarounds

**Status**: No i18n support in 0.1.x. All user-visible strings in the lib are hardcoded
Traditional Chinese (zh-TW).

Affected areas:
- `useRoutes()` — route titles (`庫存查詢`, `載具管理`, etc.)
- Internal button labels, form field labels, table column headers (all inside component source)
- Status display utilities (`changeTypeName`, `shipInventoryOrderStatusName`, etc.) — these
  functions are **not** barrel-exported and cannot be replaced

**Workaround for route titles** (the only part accessible from outside the lib):

Mirror `useRoutes()` output and replace titles:

```ts
import { useRoutes, NextPath } from '@rytass/wms-module-react';

const TITLE_MAP: Partial<Record<NextPath, string>> = {
  [NextPath.MATERIALSMANAGEMENT]: 'Materials',
  [NextPath.LOADERSMANAGEMENT]:   'Loaders',
  // ...
};

function useLocalizedRoutes() {
  const routes = useRoutes();
  return routes.map((r) => ({
    ...r,
    title: (r.href && TITLE_MAP[r.href]) ?? r.title,
    children: r.children?.map((c) => ({
      ...c,
      title: TITLE_MAP[c.href] ?? c.title,
    })),
  }));
}
```

> **Limitation**: the `TITLE_MAP` approach can only override leaf routes that have an `href`
> (e.g. `NextPath.MATERIALSMANAGEMENT`). Top-level navigation group labels such as `庫存查詢`
> and `主檔管理` have no `href` and therefore cannot be keyed in `TITLE_MAP` — they remain
> hardcoded in zh-TW. If you need to localize group titles, you must fork the lib.

For component-internal strings (form labels, buttons, column headers), there is currently no
override mechanism. The only path is to fork the lib. This is a known gap targeted for 0.2.x.

---

### 13.10 Embedded / Sectional Mode Limitations

WMS page components (`MaterialsManagement`, `InventoryList`, etc.) are designed for
**full-viewport rendering**. They use `PageWrapper` and `SectionWrapper` internally which
set `width: 100%` and `height: 100%` of the viewport.

**Embedding in a tab, panel, or drawer is not officially supported in 0.1.x.** Known issues
when embedded in a constrained container:
- Mezzanine Table column-width calculations use the viewport width
- Modal/dialog portals render at document body, not relative to the container
- React Flow (used by Maps and LocationsManagement map tab) requires a fixed-height container

There is no clean workaround in 0.1.x. If you need sectional embedding, fork the lib and
modify the `PageWrapper`/`SectionWrapper` styles to be container-relative.

---

### 13.11 App Router: Why it is Incompatible

**Status**: Not supported. The WMS frontend lib targets **Next.js Pages Router only**.

The incompatibility has three root causes that compound each other:

1. **Client-only context providers**: `InventoryActionsProvider`, `DialogProvider`,
   `ModalProvider` use `useState`/`useContext` with browser-only side effects. In App Router,
   all Server Components are rendered on the server, and these providers would need to be
   wrapped in a `'use client'` boundary — but their children (the page components) also
   transitively import many client-only hooks.

2. **`nuqs` adapter**: `useTablePageState(true)` and `PageTabs` (internal) use `nuqs` for
   URL query-string state sync. `nuqs` requires the `NuqsAdapter` from the Pages Router
   adapter (`import { NuqsAdapter } from 'nuqs/adapters/next/pages'`) — the lib was built
   and tested against this adapter.

3. **`ssr: false` dynamic loading**: The reference `AuthGuard` wraps the entire layout with
   `dynamic(..., { ssr: false })` to prevent SSR hydration mismatches from the Mezzanine UI
   portal refs and Apollo client subscriptions. In App Router, `next/dynamic` with `ssr: false`
   still works in Client Components but eliminates the benefits of Server Components.

**Features that become unavailable for WMS routes if you attempt App Router:**
- `getStaticProps` / ISR revalidate (`revalidate` option) — not available for pages rendered
  by `ssr: false` dynamic import
- Streaming SSR for WMS routes
- React Server Component data fetching
- Partial Prerendering (PPR) for WMS pages

**Unofficial sketch workaround** (untested, unsupported):

If you are building an App Router project and need to embed WMS pages, the only viable
approach would be:

```tsx
// app/wms/[...path]/page.tsx
'use client';

import dynamic from 'next/dynamic';

const WmsPageLoader = dynamic(() => import('../../../components/WmsPageLoader'), {
  ssr: false,
});

export default function WmsPage() {
  return <WmsPageLoader />;
}
```

```tsx
// components/WmsPageLoader.tsx
'use client';
import CalendarConfigProviderDayjs from '@mezzanine-ui/react/Calendar/CalendarConfigProviderDayjs';
import { ApolloProvider } from '@apollo/client/react';
// Use nuqs/adapters/next (combined adapter), NOT nuqs/adapters/next/pages.
// nuqs/adapters/next/pages uses next/router internally, which throws
// "Error: NextRouter was not mounted." hard crash in App Router context.
import { NuqsAdapter } from 'nuqs/adapters/next';
import {
  ApolloClient,
  InventoryActionsProvider,
  DialogProvider,
  ModalProvider,
} from '@rytass/wms-module-react';
// ... route the path segment to the right page component

export default function WmsPageLoader() {
  // render the right WMS page component based on current route
  return (
    <CalendarConfigProviderDayjs>
      <ApolloProvider client={ApolloClient}>
        <NuqsAdapter>
          <InventoryActionsProvider>
            <DialogProvider>
              <ModalProvider>
                {/* WMS page component here */}
              </ModalProvider>
            </DialogProvider>
          </InventoryActionsProvider>
        </NuqsAdapter>
      </ApolloProvider>
    </CalendarConfigProviderDayjs>
  );
}
```

> **Warning**: This is **officially unsupported and untested**. Even with the correct
> `nuqs/adapters/next` combined adapter, the runtime behaviour of `useQueryState` inside lib
> components may be incorrect because the lib was built and tested exclusively against the
> Pages Router adapter. Use Pages Router for all WMS pages.

Use Pages Router for WMS pages.

---

### 13.12 Vite and Other Bundlers

**Status**: Partially supported. The lib is tested against Next.js / webpack 5. Vite support
is not officially tested.

**For Vite consumers:**

1. The `transpilePackages` mechanism (Next.js specific) is not needed. Vite handles ESM
   natively.
2. Mirror the Next.js `/graphql` rewrite with a Vite proxy:

```ts
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/graphql': {
        target: 'http://localhost:7103',
        changeOrigin: true,
      },
    },
  },
});
```

3. The `nuqs` adapter import (`nuqs/adapters/next/pages`) is Next.js specific. WMS page
   components that use `nuqs` internally will break in a Vite + React app without a
   compatible `nuqs` adapter. As of `nuqs@2`, use `nuqs/adapters/react` but you will need
   to wrap WMS components appropriately.
4. `@mezzanine-ui/react` imports `lodash/compact` without a `.js` extension, which may
   require `resolve.alias` configuration in Vite.

No official Vite setup guide exists for 0.1.x.

---

### 13.13 Existing Monorepo Considerations

If you already have an Nx or Turborepo monorepo, you can add the WMS modules without
creating a new monorepo. Key points:

**What you must replicate:**

- `transpilePackages` list in `next.config.ts` (§5.3) — required by any Next.js app
  consuming the ESM lib, regardless of monorepo structure
- The `/graphql` rewrite in `next.config.ts`
- CSS imports in `_app.tsx` (§5.1)
- The three provider wrappers (§13.7)

**What you can skip:**

- The worktree / Nx project structure — you do not need to use Nx. The lib is a plain npm
  package.
- The `libs/*` is-NOT-a-workspace rule — only applies to the Rytass monorepo's internal
  build pipeline. Your monorepo can import `@rytass/wms-module-react` as a regular npm dep.
- Any `tsconfig.base.json` path aliases to lib source — those are only needed if you want
  to consume lib source directly (skipping `npm install`). Normal consumers use the published
  package.

**TypeScript path aliases**: if your monorepo uses path aliases that overlap with
`@rytass/wms-module-*` package names, ensure they point to `node_modules` (the installed
package), not local source, to avoid confusion.

### 13.13.1 pnpm peer-dep multi-instantiation hazard

When a pnpm workspace contains apps that resolve `@nestjs/core` (or other peers
of `@rytass/wms-module-core`) to different major versions, pnpm creates one
**instance** of `@rytass/wms-module-core` per unique peer resolution. Both
instances register their TypeORM entity decorators against the same global
`getMetadataArgsStorage()`, producing:

```
TypeError: Cannot read properties of undefined (reading 'ownColumns')
    at EntityMetadataBuilder.ts:548
```

**Required workaround**: every workspace app that imports `@rytass/wms-module-core`
(directly or transitively via `@rytass/wms-module-graphql`) must resolve to the
same `@nestjs/*` major version. Options:

1. Upgrade the entire workspace to a single NestJS major (preferred)
2. Force pnpm to deduplicate the WMS module instance:

   ```yaml
   # pnpm-workspace.yaml
   overrides:
     '@rytass/wms-module-core': '0.1.4'
   ```

3. Apply `public-hoist-pattern[]` for `@rytass/wms-module-*` in `.npmrc`

This is a structural limitation of the pnpm peer-resolution model combined
with TypeORM's global metadata storage; the WMS lib cannot deduplicate
itself without rewriting TypeORM's entity registry. Yarn 4 and npm 10 do not
hit this because their hoisting strategies differ — pnpm with strict mode is
the only affected case.

---

### 13.14 GraphQL Type Name Conflicts

WMS uses common DTO and type names such as `MaterialDto`, `LocationDto`, `BatchDto`,
`LoaderDto`, `StockStatus` (enum), `ChangeType` (enum), and others. If a host
application's existing GraphQL schema already declares types with the same names —
common in retail and logistics domains — running both schemas in the same NestJS process
would fail at schema registration with:

```
Error: Schema must contain uniquely named types but contains multiple types named "MaterialDto"
```

There is no name-prefixing or namespace configuration in the lib's DTOs. This constraint
affects **all** GraphQL types in the WMS schema: ObjectTypes, InputTypes, Enums, and any
union types.

The viable options are the same as those described in §13.1:

1. **Run WMS as a separate NestJS process** (recommended) — isolates schemas entirely;
   no type name collisions possible.
2. **Fork the lib and add a type prefix** — rename all DTO classes (e.g. `WmsMaterialDto`)
   and regenerate the React lib's codegen. Requires maintaining a fork.
3. **Wait for a future major release** — a type prefix configuration option is a candidate
   for a future major version that introduces namespace support.

Unlike the §13.1 `GraphQLModule` co-existence story (fixed in 0.3.0), the type-name collision is a **shared-schema** problem: every `@Resolver()` provider in the DI container, WMS or host-app, contributes to the same `GraphQLSchema` instance. Renaming the host app's types away from WMS-occupied names is the only fix without splitting processes.


## 14. Reference implementation (`wms-standalone`)

A complete, runnable integration sample lives at `~/Downloads/wms-standalone` on the maintainers' machines; the published equivalent is the original monorepo's `apps/api` and `apps/client`.

Structure recap:

```
wms-standalone/
  apps/
    api/
      src/
        main.ts                       17 LOC   NestJS bootstrap
        app/app.module.ts             60 LOC   WmsModuleGraphqlModule + GraphQLModule.forRootAsync
      .env                             6 LOC   PG credentials
      package.json
    client/
      src/
        pages/
          _app.tsx                    31 LOC   Provider chain
          index.tsx                    7 LOC   Home (return null)
          <area>/index.tsx     19 x  ~10 LOC   <Component /> shells
        auth/
          AuthGuard.tsx               27 LOC   ssr:false dynamic load
          AuthorizedAdminPage/
            index.tsx                 25 LOC   Provider stack
            Main.tsx                  19 LOC   Flex layout
            Navigation.tsx            79 LOC   useRoutes() + MznNavigation
        styles/
          mezzanine.scss              51 LOC   Mezzanine setup + overrides
          global.scss                 12 LOC   Global reset
      next.config.ts                  29 LOC   transpilePackages + rewrites
  scripts/
    seed.mjs                         286 LOC   GraphQL mutation seed
```

Totals: **~860 LOC** including the seed script, **~574 LOC** of pure integration code (no test data).

Of those, **only the 79-line Navigation has any non-trivial logic**. Everything else is wiring boilerplate.

This document and the [API Reference](./api-reference.md) are the authoritative reproduction recipe.
