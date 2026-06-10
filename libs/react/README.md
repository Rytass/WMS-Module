# @rytass/wms-module-react

Drop-in React UI for the Rytass Warehouse Management System (WMS) — full admin screens (loaders, materials, locations, inventory list / count / movement, receive / ship orders, change history, maps, label search), context providers, generic hooks, an Apollo Client factory and pre-generated typed GraphQL operations.

Pair with [`@rytass/wms-module-graphql`](https://www.npmjs.com/package/@rytass/wms-module-graphql) on the server side. Designed for Next.js 15 Pages Router consumers.

## Install

```bash
yarn add @rytass/wms-module-react
# peer deps
yarn add react react-dom next @apollo/client graphql \
  @mezzanine-ui/core @mezzanine-ui/system @mezzanine-ui/react @mezzanine-ui/icons \
  react-hook-form @hookform/error-message @hookform/resolvers yup nuqs lodash luxon
```

> **Heads up — Pages Router only for v0.1.x.** 100+ migrated components call `useRouter` from `next/router`. App Router support is on the roadmap.

## Next.js setup

Add the package to Next's `transpilePackages` so its CSS Modules and ESM bundles are processed:

```js
// next.config.js
module.exports = {
  transpilePackages: [
    '@mezzanine-ui/core',
    '@mezzanine-ui/system',
    '@mezzanine-ui/react',
    '@mezzanine-ui/icons',
    '@rytass/wms-module-react',
  ],
  rewrites: async () => [
    {
      source: '/graphql',
      destination: `${process.env.API_URL ?? 'http://localhost:7103'}/graphql`,
    },
  ],
};
```

## Mounting the providers

```tsx
// pages/_app.tsx
import '@mezzanine-ui/core/style/index.css';
import { AppProps } from 'next/app';
import { ApolloProvider } from '@apollo/client/react';
import CalendarConfigProviderDayjs from '@mezzanine-ui/react/Calendar/CalendarConfigProviderDayjs';
import { NuqsAdapter } from 'nuqs/adapters/next/pages';
import {
  ApolloClient,
  DialogProvider,
  InventoryActionsProvider,
  ModalProvider,
} from '@rytass/wms-module-react';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ApolloProvider client={ApolloClient}>
      <CalendarConfigProviderDayjs>
        <NuqsAdapter>
          <InventoryActionsProvider>
            <DialogProvider>
              <ModalProvider>
                <Component {...pageProps} />
              </ModalProvider>
            </DialogProvider>
          </InventoryActionsProvider>
        </NuqsAdapter>
      </CalendarConfigProviderDayjs>
    </ApolloProvider>
  );
}
```

`ApolloClient` is a ready-to-use singleton that POSTs to `/graphql` (use the rewrite above to forward to your backend). Need a custom configuration? Call `createApolloClient()` instead and wire your own links / cache.

## Mounting pages

Each WMS screen is exported as a default-named component. Drop them into any Pages-Router route:

```tsx
// pages/loaders-management/index.tsx
import { LoadersManagement } from '@rytass/wms-module-react';
export default function LoadersManagementPage() {
  return <LoadersManagement />;
}
```

Available top-level pages: `ChangeHistory`, `InventoryCount`, `InventoryList`, `InventoryMovement`, `LabelSearch`, `LoadersManagement`, `LocationsManagement`, `Maps`, `MaterialsManagement`, `ReceiveInventoryOrders`, `ShipInventoryOrders`. Dynamic-route detail screens: `CreateLoader`, `EditReceiveInventoryOrder`, `ViewReceiveInventoryOrder`, `EditShipInventoryOrder`, `ViewShipInventoryOrder`, `EditTransferOrder`.

## Route constants

The lib hard-codes the route paths in the `NextPath` enum and `useRoutes()` hook (used to build the sidebar). For v0.1.0, consumers must mount the page components at the same URL paths the lib expects. A future version will accept a routing strategy hook.

```ts
import { NextPath, useRoutes } from '@rytass/wms-module-react';

// NextPath.LOADERSMANAGEMENT === '/loaders-management'
```

## GraphQL operations

All typed mutations / queries / fragments are pre-generated as `TypedDocumentNode`s and re-exported from the package root. Consumers do not need to run graphql-codegen:

```ts
import { useLoadersQuery, AggregatedStockFragment } from '@rytass/wms-module-react';
```

## Known issues for standalone consumers

`@mezzanine-ui/react` (a peer dependency) ships JavaScript files written in ESM syntax but does **not** set `"type": "module"` in its `package.json`, and its files import lodash subpaths without explicit `.js` extensions (e.g. `import compact from 'lodash/compact'`). This combination fails Node's ESM resolver when this lib (which is `"type": "module"`) imports Mezzanine UI at SSR time on a fresh npm-installed Next.js app.

The Rytass internal monorepo does not hit this because `apps/client` builds the lib from source through a `tsconfig` path alias — Next.js's webpack therefore transpiles Mezzanine UI alongside the consumer code, and webpack's resolver tolerates the missing extensions. For a standalone consumer that `npm install`s us, you currently need one of:

- Use yarn workspaces with hoisting and run the consumer through Nx (mirrors the Rytass setup).
- Wait for Mezzanine UI to publish a corrected ESM build.
- Pre-bundle Mezzanine UI into the consumer's app using `next.config.js` `transpilePackages` plus a custom webpack `resolve.extensionAlias` (still does not fully cover the SSR `next start` page-data-collection step).

Track upstream progress via the [Mezzanine UI repo](https://github.com/mezzanine-ui/mezzanine).

## Generic hooks

`useColumnWidthPersistence`, `useFormCancel`, `usePreviousValue`, `useRoutes`, `useFetchAllOptions`, `useFetchMoreOptions`, `useInsertOption`, `useSortTable`, `useTablePageState`, `useTablePageTotal` — useful for custom screens that follow the same conventions as the bundled pages.

## Documentation

Full documentation is shipped inside this package under the `docs/` directory (available after `npm install`):

| Document | Description |
|---|---|
| [`docs/integration-guide.md`](./docs/integration-guide.md) | Step-by-step wiring guide for NestJS + Next.js consumers |
| [`docs/api-reference.md`](./docs/api-reference.md) | Complete export catalog with signatures and usage examples |

GitHub hosted links (always up-to-date):

- [Integration Guide — §5 Frontend setup](https://github.com/Rytass/WMS-Module/blob/main/libs/graphql/docs/integration-guide.md#5-frontend-setup-nextjs-pages-router)
- [Integration Guide — §6 Pages Router shell pattern](https://github.com/Rytass/WMS-Module/blob/main/libs/graphql/docs/integration-guide.md#6-pages-router-shell-pattern-the-19-thin-shells)
- [Integration Guide — §7 Apollo client wiring](https://github.com/Rytass/WMS-Module/blob/main/libs/graphql/docs/integration-guide.md#7-apollo-client-wiring)
- [Integration Guide — §8 Authentication / authorization](https://github.com/Rytass/WMS-Module/blob/main/libs/graphql/docs/integration-guide.md#8-authentication-authorization--events)
- [API Reference — @rytass/wms-module-react](https://github.com/Rytass/WMS-Module/blob/main/libs/graphql/docs/api-reference.md#rytasswms-module-react)

## License

MIT
