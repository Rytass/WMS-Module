# Event Payload v2 — Design / Implementation Notes

> **Status: IMPLEMENTED (pending release).** The payloads specified here are now
> built across `libs/core` + `libs/graphql` and pass `nx build` + strict
> `tsc --noEmit`. The questions originally in §6 are settled and recorded inline
> (search "**Decided**"). This file lives in the repo's root `docs/` and is **not**
> published to npm.
>
> Baseline shipped: `@rytass/wms-module-core@0.2.0`,
> `@rytass/wms-module-graphql@0.5.0` (the v1 thin shapes below). The v2 payloads
> are committed but **not yet released** — they ship on the next minor bump
> (core `0.3.0`, graphql `0.6.0`).

## 0. Why

v1 event payloads are too thin for subscribers:

- **Operation events** `{ id, result }` — `result` is typed `unknown`, and **9 of 38
  mutations return only `boolean`** (the action mutations), so those events carry
  almost nothing. No `actor` (who did it), no `args` (what was attempted).
- **Stock events** `{ orderId, itemId, quantityDelta, changeType }` — no
  `materialId / batchId / locationId / loaderId`.

Goal: give subscribers enough to drive audit / notification / ERP-sync, while
staying host-neutral and backwards-compatible.

## 1. Locked decisions

- **Operation**: add `args` + `actor` + **per-event typed `result`**.
- **Stock**: **lazy by default** (ids only; enrich post-commit yourself) + **opt-in
  eager** (`enrichStockEvents: true`).

## 2. Design principles

1. **Additive & optional** → existing subscribers unaffected → **minor** bump
   (core + graphql).
2. **Host-neutral actor**: obtained via an injectable `actorExtractor` (mirrors the
   `authChecker` pattern); member-base ships a default. Not configured → `actor: null`.
3. **Type location**: result DTOs live in `libs/graphql` (`*.dto.ts`); the event
   contracts live in `libs/core`. Core **cannot** import graphql DTOs (would be a
   dependency cycle), so:
   - core keeps `WmsOperationEventPayload<TResult = unknown>` (runtime is type-erased);
   - graphql provides a **typed overlay** `WmsOperationResultMap` + typed
     `beforeHooks` / `afterListeners` maps that consumers actually use.

---

## 3. Operation event payload

### 3.1 New shape

```ts
// libs/core/src/lib/events/wms-event.types.ts
export interface WmsActor {
  readonly id: string;
  readonly domain?: string;
  readonly raw?: unknown;            // host-specific extras (optional)
}

export interface WmsOperationEventPayload<TResult = unknown> {
  readonly id: string | null;        // (existing) primary id of the order/entity
  readonly result: TResult;          // (existing) the mutation return value
  readonly args: Readonly<Record<string, unknown>>;   // NEW — the GraphQL input (intent)
  readonly actor: WmsActor | null;   // NEW — who performed it
}
```

`WmsBeforeHookContext` also gains `actor` (so before-hooks can veto by identity).

### 3.2 Actor

- Contract: `WmsActorExtractor = (context: ExecutionContext) => WmsActor | null`,
  injected via `forRootAsync({ actorExtractor })` (token `WMS_ACTOR_EXTRACTOR`).
- **member-base default** (`memberBaseActorExtractor`, new export on the
  `@rytass/wms-module-graphql/adapters/member-base` subpath): reads
  `GqlExecutionContext.create(ctx).getContext().req?.payload`.
  - **Confirmed actual shape** of member-base's `req.payload`: `{ id: string; domain?: string }`.
  - → default actor = `{ id, domain }`.
- **Decided**: actor = `{ id, domain, raw }` — the raw JWT payload is attached as
  `raw` for host-specific extras. `name` / `email` / roles are **not** on the JWT
  payload and are out of scope; a richer actor would require the extractor to look
  the member up (extra query) or the host to put more on the token.

### 3.3 Per-event `result` target (the actual DTOs)

29 events return a DTO; **9 action events return `boolean`** (marked ⚠️). For the
boolean ones the real signal comes from `args` + the **stock events they fan out to**
(§4) — the operation event itself only confirms success.

| Event | `result` type | Key result fields (see §3.5 for full DTO) |
|------------------------------------------|----------------------------|---------------------------------------------|
| `material.created` / `material.updated` | `MaterialDto` | id, key, description, isActive |
| `location.created` / `location.updated` | `LocationDto` | id, key, description, isActive? |
| `warehouse-map.updated` | `MapDataDto` | id, backgrounds[], ranges[] |
| `loader.created` | `LoaderDto[]` | array of loaders |
| `loader.batch-created` | `LoaderDto[]` | array of loaders |
| `loader.updated` | `LoaderDto` | id, serialId, …, isActive, createdAt |
| `loader.type-created` / `loader.type-updated` | `LoaderTypeDto` | id, key, description, isActive, timestamps |
| `receive-inventory-order.created` / `.updated` | `ReceiveInventoryOrderDto` | id, key, description, items[], status |
| `receive-inventory-order.received` | `boolean` ⚠️ | — (use args + `stock.received`) |
| `allocate-inventory-order.created` / `.updated` | `AllocateInventoryOrderDto` | id, key, createdAt |
| `allocate-inventory-order.deallocated` | `boolean` ⚠️ | — (use args + `stock.deallocated`) |
| `hold-inventory-order.created` / `.updated` | `HoldInventoryOrderDto` | id, key, items[], createdBy?, createdAt |
| `hold-inventory-order.released` | `boolean` ⚠️ | — (use args + `stock.released`) |
| `reclassify-inventory-order.reclassified` | `ReclassifyInventoryOrderDto` | id, key, items[], createdAt |
| `ship-inventory-order.created` / `.updated` | `ShipInventoryOrderDto` | id, key, description, items[], status |
| `ship-inventory-order.shipped` | `boolean` ⚠️ | — (use args + `stock.shipped`) |
| `ship-inventory-order.ship-cancelled` | `boolean` ⚠️ | — (use args + `stock.shipped` negative) |
| `batch.merged` | `MergeBatchOrderDto` | id, key, createdAt |
| `batch.splitted` | `SplitBatchOrderDto` | id, key, createdAt |
| `scrape-order.scraped` | `ScrapeOrderDto` | id, key, items[], createdAt |
| `quality-inspection-order.inspected` | `QualityInspectionOrderDto` | id, key, note?, items[], createdAt |
| `transfer-order.created` / `.updated` | `TransferOrderDto` | id, key, description?, receiver?, items[] |
| `transfer-order.transferred` | `boolean` ⚠️ | — (use args + `stock.transferred`) |
| `transfer-order.transfer-cancelled` | `boolean` ⚠️ | — (use args + `stock.in-transfer` reversal) |
| `transfer-customer-order.created` / `.updated` | `TransferCustomerOrderDto` | id, key, items[], createdAt |
| `transfer-customer-order.returned` | `boolean` ⚠️ | — (use args + `stock.customer-returned`) |
| `transfer-vendor-order.created` / `.updated` | `TransferVendorOrderDto` | id, key, items[], createdAt |
| `transfer-vendor-order.returned` | `boolean` ⚠️ | — (use args + `stock.vendor-returned`) |

Counts: **29 DTO-returning, 9 boolean** (`received`, `deallocated`, `released`,
`shipped`, `ship-cancelled`, `transferred`, `transfer-cancelled`, customer/vendor
`returned`).

### 3.4 `args` per boolean action event (their real intent signal)

Since the 9 boolean events have no useful `result`, here is what their `args`
carry — this is what a subscriber sees as "what was attempted":

| Event | args (per item in the array) |
|------------------------------------------|--------------------------------------------------------|
| `receive-inventory-order.received` | `{ itemId, quantity, batchKey?, locationKey?, loaderKey?, inspectionResult? }` |
| `ship-inventory-order.shipped` | `{ itemId, quantity }` |
| `ship-inventory-order.ship-cancelled` | `{ itemId, quantity? }` |
| `transfer-order.transferred` | `{ itemId, quantity }` |
| `transfer-order.transfer-cancelled` | `{ itemId, quantity? }` |
| `hold-inventory-order.released` | `{ aggregatedKey, quantity, unitId? }` |
| `allocate-inventory-order.deallocated` | `{ aggregatedKey, quantity, unitId? }` |
| `transfer-customer-order.returned` | `{ aggregatedKey, quantity, unitId?, locationKey, loaderKey? }` |
| `transfer-vendor-order.returned` | `{ aggregatedKey, quantity, unitId?, locationKey, loaderKey? }` |

(All are passed as `@Args('items', …) items: T[]`, so `args.items` is the array.)

### 3.5 `WmsOperationResultMap` (the typed overlay, graphql)

```ts
// libs/graphql/src/lib/events/operation-result-map.ts (NEW)
import type { MaterialDto, LocationDto, MapDataDto, LoaderDto, LoaderTypeDto,
  ReceiveInventoryOrderDto, AllocateInventoryOrderDto, HoldInventoryOrderDto,
  ReclassifyInventoryOrderDto, ShipInventoryOrderDto, MergeBatchOrderDto,
  SplitBatchOrderDto, ScrapeOrderDto, QualityInspectionOrderDto, TransferOrderDto,
  TransferCustomerOrderDto, TransferVendorOrderDto } from '../dto';

export interface WmsOperationResultMap {
  'material.created': MaterialDto;            'material.updated': MaterialDto;
  'location.created': LocationDto;            'location.updated': LocationDto;
  'warehouse-map.updated': MapDataDto;
  'loader.created': LoaderDto[];              'loader.batch-created': LoaderDto[];
  'loader.updated': LoaderDto;
  'loader.type-created': LoaderTypeDto;       'loader.type-updated': LoaderTypeDto;
  'receive-inventory-order.created': ReceiveInventoryOrderDto;
  'receive-inventory-order.updated': ReceiveInventoryOrderDto;
  'receive-inventory-order.received': boolean;
  'allocate-inventory-order.created': AllocateInventoryOrderDto;
  'allocate-inventory-order.updated': AllocateInventoryOrderDto;
  'allocate-inventory-order.deallocated': boolean;
  'hold-inventory-order.created': HoldInventoryOrderDto;
  'hold-inventory-order.updated': HoldInventoryOrderDto;
  'hold-inventory-order.released': boolean;
  'reclassify-inventory-order.reclassified': ReclassifyInventoryOrderDto;
  'ship-inventory-order.created': ShipInventoryOrderDto;
  'ship-inventory-order.updated': ShipInventoryOrderDto;
  'ship-inventory-order.shipped': boolean;
  'ship-inventory-order.ship-cancelled': boolean;
  'batch.merged': MergeBatchOrderDto;         'batch.splitted': SplitBatchOrderDto;
  'scrape-order.scraped': ScrapeOrderDto;
  'quality-inspection-order.inspected': QualityInspectionOrderDto;
  'transfer-order.created': TransferOrderDto; 'transfer-order.updated': TransferOrderDto;
  'transfer-order.transferred': boolean;
  'transfer-order.transfer-cancelled': boolean;
  'transfer-customer-order.created': TransferCustomerOrderDto;
  'transfer-customer-order.updated': TransferCustomerOrderDto;
  'transfer-customer-order.returned': boolean;
  'transfer-vendor-order.created': TransferVendorOrderDto;
  'transfer-vendor-order.updated': TransferVendorOrderDto;
  'transfer-vendor-order.returned': boolean;
}
```

Then graphql re-declares the option maps so consumers get the typed result:

```ts
export type WmsTypedAfterListenerMap = {
  [N in WmsEventName]?: (ctx: {
    event: N;
    payload: N extends keyof WmsOperationResultMap
      ? WmsOperationEventPayload<WmsOperationResultMap[N]>   // operation events: typed result
      : WmsStockEventPayload;                                // stock events
  }) => void | Promise<void>;
};
```

> Maintenance note: every new mutation must add a `WmsOperationResultMap` entry
> (enforced by making the map cover `WmsOperationEventName` exhaustively).

### 3.6 Decided — boolean action mutations stay `boolean`

The 9 boolean events can never have a rich `result` without **changing the GraphQL
return type** of those resolvers (e.g. `ship(): Boolean` → `ship(): ShipResult`),
which is a **breaking schema change** for existing GraphQL clients. **Decided: keep
`result: boolean`** for this additive enrichment; their real signal is `args` + the
stock events they fan out to. A richer action result would be a separate (major)
change.

---

## 4. Stock event payload

### 4.1 Lazy default (no change)

```ts
export interface WmsStockEventPayload {
  readonly orderId: string;
  readonly itemId: string;
  readonly quantityDelta: number;
  readonly changeType: ChangeType | null;     // null only for stock.inspection-resolved
  readonly inspectionResult?: boolean | null; // QI only (already shipped)
}
```

Consumers needing details query post-commit by `orderId`/`itemId` (docs already show
`StockService.selectQueryBuilder`).

### 4.2 Eager (`enrichStockEvents: true`) — added fields

```ts
  // appended to WmsStockEventPayload (all optional):
  readonly materialId?: string | null;
  readonly batchId?: string | null;
  readonly locationId?: string | null;
  readonly loaderId?: string | null;
```

Mechanism: in `StockChangeSubscriber.afterInsert`, when the flag is on, load the
change's `item` relation by `itemId` (generically via `event.metadata.relations`) in
the **same transaction** — **one indexed PK lookup per stock event** — and copy
these ids. `try/catch` → degrade to the lazy payload on any miss. (No expensive
status computation; `status` stays a post-commit lookup for those who want it.)

### 4.3 ⚠️ Per-domain eager completeness (IMPORTANT — verify)

All 12 change entities have the `item` relation, but the order-item rows differ:

| Domain (stock events) | materialId | batchId | locationId | loaderId |
|----------------------------------|:----------:|:-------:|:----------:|:--------:|
| receive (`stock.received`) | ✅ | ✅* | ✅* | ✅* |
| ship (`stock.in-shipment/.shipped`) | ✅ | ✅ | ✅* | ✅* |
| transfer-order (`stock.in-transfer/.transferred`) | ✅ | ✅ | ✅ | ✅* |
| transfer-vendor (`stock.vendor-*`) | ✅ | ✅ | ✅* | ✅* |
| transfer-customer (`stock.customer-*`) | ✅ | ✅ | ✅* | ✅* |
| hold (`stock.held/.released`) | ✅ | ✅ | ✅* | ✅* |
| allocate (`stock.allocated/.deallocated`) | ✅ | ✅ | ✅* | ✅* |
| scrape (`stock.scraped`) | ✅ | ✅ | ✅* | ✅* |
| quality-inspection (`stock.inspection-resolved`) | ✅ | ✅ | ✅* | ✅* |
| **split (`stock.splitted`)** | ❌ | ❌ | ✅* | ✅* |
| **merge (`stock.merged`)** | ❌ | ❌ | ✅ | ✅* |
| **reclassify (`stock.reclassified`)** | ❌ | ❌ | ✅ | ✅* |

`*` = column is nullable (may be `null` even when present). **split / merge /
reclassify order-items have NO `materialId` / `batchId`** — those domains operate at
batch-aggregation level and keep that metadata on the **parent order**, not the item.
So eager enrichment gives those 3 only `locationId` / `loaderId`.

> **Decided**: accept partial enrichment for split/merge/reclassify (cheap, 1
> query). `StockChangeSubscriber.loadItemFields` does one generic PK lookup on the
> `item` relation, so those 3 domains get `locationId` / `loaderId` only and
> `materialId` / `batchId` stay `null` (their item rows have no such columns). No
> parent-order lookup.

### 4.4 transfer extras (not included)

`TransferOrderItem` also has `targetLocationId` / `targetLoaderId` (the move
destination). **Decided: not added** in v2 — the generic enrichment reads only the
common `materialId / batchId / locationId / loaderId`. Revisit per-domain if a
subscriber needs the move destination.

---

## 5. Backwards compatibility & versioning

- Every new field is **optional/additive** → no break for existing subscribers.
- `actorExtractor` / `enrichStockEvents` are optional options → default behaviour
  unchanged (actor `null`, no enrichment).
- → **minor** bump: core `0.2.0 → 0.3.0`, graphql `0.5.0 → 0.6.0` (react patch-bumps
  via dependents as before).

---

## 6. Decisions (as implemented)

1. **Result-DTO mapping (§3.3 / §3.5)** — implemented in
   `libs/graphql/src/lib/events/operation-result-map.ts` (29 DTO + 9 boolean),
   exhaustive over `WmsOperationEventName`.
2. **Actor (§3.2)** — `{ id, domain, raw }`; no member lookup. Richer identity
   (name/email/roles) is out of scope.
3. **Boolean actions (§3.6)** — kept as `result: boolean`; signal = `args` + stock
   events. No schema change.
4. **Stock eager completeness (§4.3)** — partial enrichment accepted; split / merge
   / reclassify get `locationId` / `loaderId` only.
5. **`args` payload size** — full `args` included, no cap / opt-out. Subscribers
   that care about size filter on their side.
6. **transfer target fields (§4.4)** — not included.

---

## 7. Out of scope but noticed (separate follow-up)

The repo has **two** docs directories: `libs/graphql/docs/` (shipped to npm) and
root `docs/`. They are **not** linked, and root `docs/` is **stale** — it is missing
the v1 `events.md`, `authorization.md`, and the §8.6 update that exist under
`libs/graphql/docs/`. The README's GitHub links point at root `docs/`. Recommend a
separate task to reconcile/sync (or make one a symlink) so GitHub readers see current
docs.
