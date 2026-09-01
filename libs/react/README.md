# @rytass/wms-module-react

Drop-in React UI for the Rytass Warehouse Management System (WMS) — full admin screens (loaders, materials, locations, inventory list / count / movement, receive / ship orders, change history, maps, label search), context providers, generic hooks, an Apollo Client factory and pre-generated typed GraphQL operations.

Pair with [`@rytass/wms-module-graphql`](https://www.npmjs.com/package/@rytass/wms-module-graphql) on the server side. Works with both the Next.js 15 **Pages Router** and **App Router** — you pick the matching router bridge at the app root (see below).

## Install

```bash
yarn add @rytass/wms-module-react
# peer deps
yarn add react react-dom next @apollo/client graphql \
  @mezzanine-ui/core @mezzanine-ui/system @mezzanine-ui/react @mezzanine-ui/icons \
  @rytass/wms-map-react-components \
  react-hook-form @hookform/resolvers yup nuqs lodash
```

> **Router support — Pages **and** App Router since v0.2.0.** Components no longer import `next/router` directly; navigation is injected through a `WmsRouterProvider`. Mount the bridge that matches your app:
>
> - Pages Router → `@rytass/wms-module-react/router/pages` (`WmsPagesRouterProvider`)
> - App Router → `@rytass/wms-module-react/router/app` (`WmsAppRouterProvider`)
>
> **Migrating from v0.1.x (breaking):** v0.1.x reached into `next/router` automatically. From v0.2.0 you must wrap the tree in one of the two bridges (below) — without it, components throw `useWmsRouter must be used within a WmsRouterProvider`. Also pick the matching `NuqsAdapter` (`nuqs/adapters/next/pages` vs `.../app`).

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

The provider stack is identical across both routers — only the **router bridge** and the **`NuqsAdapter` import path** differ.

### Pages Router

```tsx
// pages/_app.tsx
import '@mezzanine-ui/core/style/index.css';
import { AppProps } from 'next/app';
import { ApolloProvider } from '@apollo/client/react';
import CalendarConfigProviderDayjs from '@mezzanine-ui/react/Calendar/CalendarConfigProviderDayjs';
import { NuqsAdapter } from 'nuqs/adapters/next/pages';
import WmsPagesRouterProvider from '@rytass/wms-module-react/router/pages';
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
          <WmsPagesRouterProvider>
            <InventoryActionsProvider>
              <DialogProvider>
                <ModalProvider>
                  <Component {...pageProps} />
                </ModalProvider>
              </DialogProvider>
            </InventoryActionsProvider>
          </WmsPagesRouterProvider>
        </NuqsAdapter>
      </CalendarConfigProviderDayjs>
    </ApolloProvider>
  );
}
```

### App Router

Put the whole stack in a single `'use client'` providers component and render it from the root layout. Swap the bridge for `WmsAppRouterProvider` and the adapter for `nuqs/adapters/next/app`:

```tsx
// app/providers.tsx
'use client';

import { ReactNode } from 'react';
import { ApolloProvider } from '@apollo/client/react';
import CalendarConfigProviderDayjs from '@mezzanine-ui/react/Calendar/CalendarConfigProviderDayjs';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import WmsAppRouterProvider from '@rytass/wms-module-react/router/app';
import {
  ApolloClient,
  DialogProvider,
  InventoryActionsProvider,
  ModalProvider,
} from '@rytass/wms-module-react';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ApolloProvider client={ApolloClient}>
      <CalendarConfigProviderDayjs>
        <NuqsAdapter>
          <WmsAppRouterProvider>
            <InventoryActionsProvider>
              <DialogProvider>
                <ModalProvider>{children}</ModalProvider>
              </DialogProvider>
            </InventoryActionsProvider>
          </WmsAppRouterProvider>
        </NuqsAdapter>
      </CalendarConfigProviderDayjs>
    </ApolloProvider>
  );
}
```

```tsx
// app/layout.tsx
import '@mezzanine-ui/core/style/index.css';
import { ReactNode } from 'react';
import Providers from './providers';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

A runnable reference lives in [`apps/example-app-router`](https://github.com/Rytass/WMS-Module/tree/main/apps/example-app-router).

`ApolloClient` is a ready-to-use singleton that POSTs to `/graphql` (use the rewrite above to forward to your backend). Need a custom configuration? Call `createApolloClient()` instead and wire your own links / cache.

## Mounting pages

Each WMS screen is exported as a default-named component. Drop them into a route shell:

```tsx
// Pages Router — pages/loaders-management/index.tsx
import { LoadersManagement } from '@rytass/wms-module-react';
export default function LoadersManagementPage() {
  return <LoadersManagement />;
}
```

```tsx
// App Router — app/loaders-management/page.tsx
import { LoadersManagement } from '@rytass/wms-module-react';
export default function LoadersManagementPage() {
  return <LoadersManagement />;
}
```

The barrel ships a `'use client'` directive, so importing a page into an App Router server component automatically marks the re-exported subtree as a client boundary — no extra `'use client'` needed in your shell. Dynamic detail screens read their route param (`[id]`) through the active bridge, so the App Router file lives at e.g. `app/receive-inventory-orders/[id]/edit/page.tsx`.

Available top-level pages: `ChangeHistory`, `InventoryCount`, `InventoryList`, `InventoryMovement`, `LabelSearch`, `LoadersManagement`, `LocationsManagement`, `Maps`, `MaterialsManagement`, `ReceiveInventoryOrders`, `ShipInventoryOrders`. Dynamic-route detail screens: `CreateLoader`, `EditReceiveInventoryOrder`, `ViewReceiveInventoryOrder`, `EditShipInventoryOrder`, `ViewShipInventoryOrder`, `EditTransferOrder`, `ViewInventoryCount`.

## Turning inventory actions off per deployment

The stock write surfaces (`InventoryList`, `LabelSearch`, `Maps`) share one action
list. A deployment where some of those actions must never exist — because the host
system owns that step of the workflow — configures it once on
`InventoryActionsProvider`; all three surfaces follow.

```tsx
import {
  InventoryActionsProvider,
  InventoryActions,
} from '@rytass/wms-module-react';

<InventoryActionsProvider
  disabledActions={[
    InventoryActions.QualityInspection,
    InventoryActions.ReclassifyInventory,
  ]}
>
  {children}
</InventoryActionsProvider>;
```

| Prop                   | Meaning                                                                |
| ---------------------- | ---------------------------------------------------------------------- |
| `enabledActions`       | Allow-list. Only these actions exist. Mutually exclusive with the next |
| `disabledActions`      | Deny-list. These actions do not exist                                  |
| `actionFilter`         | Predicate combined with the above using AND (role checks, flags, …)    |
| `onError`              | Take over failure presentation: `(action, error) => void`              |
| `errorMessageFallback` | Message used when an error carries nothing human-readable              |

A disabled action is **absent, not greyed out**: it is gone from the `InventoryList`
dropdown and the `LabelSearch` button row, and its drawer will not mount even if
`targetAction` is set programmatically or restored from a deep link. Passing none of
these props keeps all 15 actions, exactly as before.

### Keeping the frontend and backend switches in sync

Switching an action off in the UI usually means refusing the mutation as well.
`INVENTORY_ACTION_OPERATIONS` maps each action to the GraphQL document it sends and
to the `${resource}:${action}` operation name that `@rytass/wms-module-graphql`
guards, so one host-side constant can drive both ends:

```ts
import {
  INVENTORY_ACTION_OPERATIONS,
  inventoryActionsForOperation,
} from '@rytass/wms-module-react';

INVENTORY_ACTION_OPERATIONS[InventoryActions.ShipInventory];
// { document: 'UpdateShipInventoryOrder', operation: 'ship-inventory-order:update' }

inventoryActionsForOperation('batch:split'); // [InventoryActions.SplitBatch]
```

### Action failures are always reported

Every action reports its own failures. When a mutation is rejected — an `authChecker`
denial, a `beforeHooks` veto, a network error — the message is shown, the drawer stays
open and the form keeps its values so the operator can correct and retry. Provide
`onError` to route failures into your own notification system instead.

> If you build your own Apollo client rather than using `createApolloClient()`, you
> still get these messages: they come from the action layer, not from a link.
> `createApolloClient()`'s own `ErrorLink` deliberately skips the 15 inventory-action
> documents so the same error is never shown twice.

## `Maps` is a write surface by default

`Maps` embeds the full inventory table, so mounting it grants every inventory action —
even though hosts usually gate the page on a read-only-sounding `warehouse-map`
resource. Pass `haveInventoryActionsSystem={false}` to make it read-only:

```tsx
<Maps haveInventoryActionsSystem={false} />
```

The default stays `true` in this major for backwards compatibility; **it flips to
`false` in the next major.**

## Inventory counting

`InventoryCount` (the list) and `ViewInventoryCount` (one count) implement the full
counting flow: create a count over a set of locations, start it, record what was found,
then settle the variance into stock.

> **You must mount both routes.** The list's 檢視 button navigates to
> `/inventory-count/[id]`; without that shell the button 404s.

```tsx
// pages/inventory-count/index.tsx
import { InventoryCount } from '@rytass/wms-module-react';
export default function InventoryCountPage() {
  return <InventoryCount />;
}

// pages/inventory-count/[id]/index.tsx
import { ViewInventoryCount } from '@rytass/wms-module-react';
export default function InventoryCountViewPage() {
  return <ViewInventoryCount />;
}
```

### What the operator sees

| Status         | Header actions                | Footer actions                     |
| -------------- | ----------------------------- | ---------------------------------- |
| 尚未執行 (`PENDING`)   | 下載盤點清單                  | 取消盤點 ／ 開始盤點               |
| 盤點中 (`COUNTING`)     | 下載盤點清單、上傳盤點結果    | 取消盤點 ／ 清空重填 ／ 暫存結果 ／ 執行盤差 |
| 已完成 (`COMPLETED`)   | 下載盤點清單                  | —                                  |
| 已取消 (`CANCELLED`)   | 下載盤點清單                  | —                                  |

Counted quantities are editable only while counting, and **nothing touches stock until
執行盤差**. Up to that point the numbers are working notes; the page keeps them in local
state and 暫存結果 persists them.

While the count is still 尚未執行, the header fields 名稱 / 盤點日期 / 盤點範圍 are editable in
place — moving focus out of the block saves them. 開始盤點 freezes them, because that is the
moment the book snapshot is taken and the variance is measured against it.

The sheet is paginated and filtered **on the server**: 料號 / 物料說明 / 批號 / 儲存位置 / 載具 on
the bar, and 供應商 / 客戶 / 銷售訂單號碼 / 銷售訂單項次 behind 進階搜尋. Clicking a value in the
table sets that one filter (it replaces, it does not stack). The 檢驗 / 凍結 / 調撥 icons and the
four commercial columns are snapshots taken at 開始盤點, so they keep showing the world the count
was measured against rather than today's stock.

> ⚠️ **開始盤點 locks the counted locations.** While a count is `COUNTING`, every other
> stock movement in its scope — including one your own code drives by calling a service
> directly — is refused with a 409 naming the count. See the backend note in
> [`@rytass/wms-module-graphql`](https://www.npmjs.com/package/@rytass/wms-module-graphql).

### The count sheet file

下載盤點清單 produces UTF-8 CSV **with a BOM** (so Excel reads the Chinese headers), one
row per sheet line, with the 盤點數量 column left blank for the floor to fill in:

```
盤點單號,項目識別碼,料號,物料說明,批號,儲存位置,載具,帳面數量,單位,盤點數量
IC2508300001,3f9a…c1,WATER2B003,200ml 礦泉水,2510310042,1000A1BC,BY0093,100,BOT,
```

Both 下載盤點清單 and 上傳盤點結果 work on the **whole** sheet, not the page on screen — a
truncated export would come back filled in and settle every missing line as a shortage.

上傳盤點結果 reads the file back and fills the inputs — it does **not** submit. Matching
prefers `項目識別碼`; when that column has been mangled or dropped it falls back to
料號＋批號＋儲存位置＋載具, so a sheet that was printed, written on and retyped still
works. A blank 盤點數量 means "not counted yet", not zero. Bad rows are reported together
in one message and the good rows are still applied.

Only CSV is supported. The lib carries no spreadsheet dependency, and adding one would
mean a new peer dependency for every consumer.

## Route constants

The lib hard-codes the route paths in the `NextPath` enum and `useRoutes()` hook (used to build the sidebar). For v0.1.0, consumers must mount the page components at the same URL paths the lib expects. A future version will accept a routing strategy hook.

```ts
import { NextPath, useRoutes } from '@rytass/wms-module-react';

// NextPath.LOADERSMANAGEMENT === '/loaders-management'
```

## GraphQL operations

All typed mutations / queries / fragments are pre-generated as `TypedDocumentNode`s and re-exported from the package root. Consumers do not need to run graphql-codegen:

```ts
import {
  useLoadersQuery,
  AggregatedStockFragment,
} from '@rytass/wms-module-react';
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

| Document                                                   | Description                                                |
| ---------------------------------------------------------- | ---------------------------------------------------------- |
| [`docs/integration-guide.md`](./docs/integration-guide.md) | Step-by-step wiring guide for NestJS + Next.js consumers   |
| [`docs/api-reference.md`](./docs/api-reference.md)         | Complete export catalog with signatures and usage examples |

GitHub hosted links (always up-to-date):

- [Integration Guide — §5 Frontend setup](https://github.com/Rytass/WMS-Module/blob/main/libs/graphql/docs/integration-guide.md#5-frontend-setup-nextjs-pages-router)
- [Integration Guide — §6 Pages Router shell pattern](https://github.com/Rytass/WMS-Module/blob/main/libs/graphql/docs/integration-guide.md#6-pages-router-shell-pattern-the-19-thin-shells)
- [Integration Guide — §7 Apollo client wiring](https://github.com/Rytass/WMS-Module/blob/main/libs/graphql/docs/integration-guide.md#7-apollo-client-wiring)
- [Integration Guide — §8 Authentication / authorization](https://github.com/Rytass/WMS-Module/blob/main/libs/graphql/docs/integration-guide.md#8-authentication-authorization--events)
- [API Reference — @rytass/wms-module-react](https://github.com/Rytass/WMS-Module/blob/main/libs/graphql/docs/api-reference.md#rytasswms-module-react)

## License

MIT
