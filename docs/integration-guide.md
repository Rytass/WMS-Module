# Integration Guide

How to build a Warehouse Management System on top of the `@rytass/wms-module-*` packages.

Target audience: engineers integrating WMS into a new product who want a working backend + frontend with the smallest possible amount of glue code.

> Companion document — **[API Reference](./api-reference.md)** — complete export catalog for all three packages.

## Table of Contents

1. [Overview & design philosophy](#1-overview--design-philosophy)
2. [Prerequisites](#2-prerequisites)
3. [Quick start (60 seconds)](#3-quick-start-60-seconds)
4. [Backend setup (NestJS + GraphQL + TypeORM)](#4-backend-setup-nestjs--graphql--typeorm)
5. [Frontend setup (Next.js Pages Router)](#5-frontend-setup-nextjs-pages-router)
6. [Pages Router shell pattern (the 19 thin shells)](#6-pages-router-shell-pattern-the-19-thin-shells)
7. [Apollo client wiring](#7-apollo-client-wiring)
8. [Authentication / authorization](#8-authentication--authorization)
9. [Database support matrix](#9-database-support-matrix)
10. [Seed data for demos](#10-seed-data-for-demos)
11. [Deployment notes](#11-deployment-notes)
12. [Known issues & roadmap](#12-known-issues--roadmap)
13. [Reference implementation (`wms-standalone`)](#13-reference-implementation-wms-standalone)

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
| (one forRootAsync wires up    |   ---------------------------------------
|  the entire GraphQL surface)  |   Wires the schema, depends on core for
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

---

## 3. Quick start (60 seconds)

```bash
# 1. Create a workspace and install the three packages plus their peers
mkdir my-wms && cd my-wms
pnpm init
pnpm add @rytass/wms-module-core @rytass/wms-module-graphql @rytass/wms-module-react
pnpm add @nestjs/common @nestjs/core @nestjs/graphql @nestjs/typeorm \
        @nestjs/apollo @nestjs/config @apollo/server typeorm pg reflect-metadata graphql rxjs \
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

The entire backend domain is wired in a single `forRootAsync` call on `WmsModuleGraphqlModule`. The module cascades into `WmsModuleCoreModule` automatically — the consumer **does not** import `wms-module-core` directly.

```ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { WmsModuleGraphqlModule } from '@rytass/wms-module-graphql';
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

    // WMS GraphQL - one call wires the entire domain
    WmsModuleGraphqlModule.forRootAsync(
      {
        useFactory: async () => ({}),
        // Module-init seed values; the keys you pass here are created
        // on first boot for `location`, `loaderType`, and `loader`.
        defaultLoaderSerialId: 'DEFAULT',
        defaultLoaderTypeKey: 'DEFAULT',
        defaultLocationKey: 'DEFAULT',
      },
      {
        driver: ApolloDriver,
        useFactory: async () => ({
          playground: false,
          introspection: true,
          cors: true,
          csrfPrevention: false,
          plugins: [ApolloServerPluginLandingPageLocalDefault()],
          autoTransformHttpErrors: true,
          autoSchemaFile: resolve(process.cwd(), 'schema.gql'),
        }),
      },
    ),
  ],
})
export class AppModule {}
```

What you get from this single `forRootAsync`:

- 50 TypeORM entities (material, batch, loader, location, every order kind, change logs, signatures, etc.)
- ~100 GraphQL types
- ~65 queries and mutations
- DataLoader N+1 prevention across every resolveField
- Default seed rows (DEFAULT location, DEFAULT loaderType, DEFAULT loader) on first boot

See [API Reference - wms-module-graphql](./api-reference.md) for the full `forRootAsync` signature.

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
    "dev": "nest start --watch -p 7103"
  },
  "dependencies": {
    "@apollo/server": "^5.0.0",
    "@as-integrations/express5": "^1.0.0",
    "@nestjs/apollo": "^13.0.0",
    "@nestjs/common": "^11.0.0",
    "@nestjs/config": "^4.0.0",
    "@nestjs/core": "^11.0.0",
    "@nestjs/graphql": "^13.0.0",
    "@nestjs/typeorm": "^11.0.0",
    "@rytass/wms-module-core": "^0.1.2",
    "@rytass/wms-module-graphql": "^0.1.2",
    "graphql": "^16.0.0",
    "pg": "^8.0.0",
    "reflect-metadata": "^0.2.0",
    "rxjs": "^7.0.0",
    "typeorm": "^0.3.0"
  }
}
```

The `@as-integrations/express5` package is required at runtime by `@nestjs/apollo@13` + Express 5; it is listed as a peer of `wms-module-graphql` since `0.1.1`.

### 4.5 Sanity check

Start the server and probe the schema:

```bash
pnpm dev
curl -s -X POST http://localhost:7103/api/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __schema { queryType { name } } }"}'
# -> {"data":{"__schema":{"queryType":{"name":"Query"}}}}

curl -s -X POST http://localhost:7103/api/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ locations { items { id key } } }"}'
# -> {"data":{"locations":{"items":[{"id":"<uuid>","key":"DEFAULT"}]}}}
```

The `DEFAULT` location/loader/loaderType returned by the second query was seeded by module init using the keys you passed in section 4.2.

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

const client = createApolloClient(/* future override args */);
```

See [API Reference - createApolloClient](./api-reference.md) for the current signature.

### 7.3 GraphQL operations & typed hooks

All queries and mutations the lib pages need are pre-defined and pre-typed at `wms-module-react`'s top level. You can import them directly to build your own pages on top of the same data layer:

```ts
import {
  useGetMaterialsQuery,
  useCreateMaterialMutation,
  type MaterialsQuery,
} from '@rytass/wms-module-react';

function MyCustomMaterialList(): ReactNode {
  const { data, loading } = useGetMaterialsQuery({ variables: { offset: 0, limit: 20 } });
  // ...
}
```

The full list of generated operations is in [API Reference - Generated GraphQL Operations](./api-reference.md).

---

## 8. Authentication / authorization

The lib **does not** ship an auth system. The page components assume they render in an authenticated context — they call queries on mount without checking session state.

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

The lib's resolvers do not enforce auth themselves. If you need RBAC, layer your own guard/decorator on top of the resolvers or apply NestJS-level guards globally in `app.module.ts`.

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
const GQL_URL = 'http://localhost:7103/api/graphql';

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

## 13. Reference implementation (`wms-standalone`)

A complete, runnable integration sample lives at `~/Downloads/wms-standalone` on the maintainers' machines; the published equivalent is the original monorepo's `apps/api` and `apps/client`.

Structure recap:

```
wms-standalone/
  apps/
    api/
      src/
        main.ts                       17 LOC   NestJS bootstrap
        app/app.module.ts             52 LOC   WmsModuleGraphqlModule.forRootAsync
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
