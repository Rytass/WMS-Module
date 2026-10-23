# Events & Hooks

How a consumer **intervenes in** (vetoes) and **gets notified about** WMS
mutations, with a host-neutral, opt-in API that mirrors the
[authorization](./authorization.md) layer's wiring.

- [1. What you get](#1-what-you-get)
- [2. Architecture — post-commit guarantee](#2-architecture--post-commit-guarantee)
- [3. Integration](#3-integration)
- [4. The `@nestjs/event-emitter` bridge](#4-the-nestjsevent-emitter-bridge)
- [5. Complete event list](#5-complete-event-list)
- [6. Payloads](#6-payloads)
- [7. Guarantees & limitations](#7-guarantees--limitations)
- [8. Public API](#8-public-api)

---

## 1. What you get

Two tiers of events, both opt-in:

- **Operation events** — exactly one per root mutation (`material.created`,
  `ship-inventory-order.shipped`, …). 38 in total.
- **Stock domain events** — driven by the `ChangeType` state machine
  (`stock.allocated`, `stock.shipped`, …), emitted once per stock movement, so a
  single operation can fan out several. 18 in total.

Two hook points per event:

- **`beforeHooks`** run *before* any DB work. Throwing **vetoes** the whole
  mutation — nothing is written, no after-listener fires. Use for custom
  authorization, validation, quota enforcement.
- **`afterListeners`** run *after the outermost transaction commits*. Use for
  audit logging, ERP/webhook sync, cache invalidation, notifications.

Everything is optional. With nothing configured the module behaves exactly as
before — no events, zero overhead.

### v2 payload enrichment (upcoming minor)

Operation event payloads will gain two new fields — `args` (the GraphQL input
that triggered the mutation) and `actor` (who performed it, obtained via an
injectable `actorExtractor`) — turning the shape from `{ id, result }` into
`{ id, result, args, actor }`. The `result` field will also become **per-event
typed** via `WmsOperationResultMap` so subscribers receive the concrete DTO
instead of `unknown`. Nine action mutations (`received`, `deallocated`, …) still
return `boolean`; their real information comes from `args` and the stock events
they fan out.

Stock event payloads gain an opt-in `enrichStockEvents: true` flag on
`forRootAsync` that appends `materialId / batchId / locationId / loaderId` (one
indexed PK lookup per event, same transaction). Without the flag the lazy shape
is unchanged. See [§6 Payloads](#6-payloads) for the full shapes and the
split/merge/reclassify partial-enrichment caveat.

---

## 2. Architecture — post-commit guarantee

The hard requirement is that an after-listener must **never** be told about a
change that was rolled back. WMS guarantees this with an `AsyncLocalStorage`
dispatch scope opened by a per-mutation interceptor:

```
GraphQL Mutation (@WmsMutationEvent)
   |
   v
WmsMutationInterceptor
   1. beforeHook(event, args)   --throw--> VETO (no transaction, clean error)
   2. als.run(scope, async () => {
        result = await handler()         // services open tx, write *_order_change rows
      })                                 //   -> StockChangeSubscriber.afterInsert
   |                                     //      collects stock.* events into the scope
   |  handler resolved == transaction committed
   v
   3. flush(scope.buffer)
        afterListener(event)  (isolated; one failure never blocks others)
        emitterBridge.forward(event)  --> EventEmitter2 (optional)
```

Why it is post-commit: TypeORM's `dataSource.transaction(cb)` resolves only
*after* `COMMIT`. The interceptor awaits the whole handler before flushing, so
the buffer is dispatched strictly after commit. If the transaction rolls back
the handler rejects, the interceptor never flushes, and the buffered events are
discarded.

Stock events are collected centrally by a single TypeORM subscriber
(`StockChangeSubscriber`) that listens to every `*_order_change` insert and
derives the `ChangeType` from the table name and the sign of `quantityChanged`.
The 12 domain services are untouched, and any future code path that writes a
change row is covered automatically.

---

## 3. Integration

`beforeHooks` / `afterListeners` are typed maps keyed by event name; the payload
is inferred from the key.

```ts
import { WmsModuleGraphqlModule } from '@rytass/wms-module-graphql';
import { memberBaseActorExtractor } from '@rytass/wms-module-graphql/adapters/member-base';
import { ForbiddenException } from '@nestjs/common';

WmsModuleGraphqlModule.forRootAsync({
  useFactory: async () => ({}),
  defaultLoaderSerialId: 'DEFAULT',
  defaultLoaderTypeKey: 'DEFAULT',
  defaultLocationKey: 'DEFAULT',

  // (v2) extract the actor from the request; member-base reads req.payload → { id, domain }
  actorExtractor: memberBaseActorExtractor,

  // (v2) append materialId/batchId/locationId/loaderId to stock event payloads
  enrichStockEvents: true,

  // intervene — runs before any DB work; throw to veto
  beforeHooks: {
    'ship-inventory-order.shipped': async ({ args, executionContext }) => {
      if (!(await canShip(args, executionContext))) {
        throw new ForbiddenException('shipment blocked');
      }
    },
  },

  // notify — runs after commit
  afterListeners: {
    // v2: payload.args carries the items[] input; payload.actor carries { id, domain }
    'ship-inventory-order.shipped': async ({ payload }) => {
      await erp.markShipped(payload.id, payload.result, payload.actor);
    },
    'stock.allocated': async ({ payload }) => {
      // v2 with enrichStockEvents: materialId/batchId/locationId/loaderId also available
      await erp.reserve(payload.orderId, payload.itemId, payload.quantityDelta);
    },
  },
});
```

- A `beforeHook` receives `{ event, args, executionContext }` — the mutation
  **intent** (raw GraphQL args), since no result exists yet. Throw (e.g. a
  `ForbiddenException`) to abort with zero side effects.
- An `afterListener` receives `{ event, payload }` — the committed result (see
  [§6](#6-payloads)). It may be async; a thrown error is logged and isolated, it
  never affects the committed mutation or other listeners.
- **(v2)** `payload.args` carries the full GraphQL input that triggered the mutation
  — particularly useful for the 9 boolean action events whose `result` is
  `true`/`false` only.
- **(v2)** `payload.actor` is `WmsActor | null` — populated when `actorExtractor`
  is configured, `null` otherwise. Shape: `{ id: string; domain?: string; raw?:
  unknown }`. The `memberBaseActorExtractor` helper (exported from the
  `@rytass/wms-module-graphql/adapters/member-base` subpath) reads
  `req.payload` and returns `{ id, domain }`.

### 3.1 The 9 boolean action events

Nine mutations return `boolean` and cannot carry a rich DTO `result` without a
breaking GraphQL schema change. For subscribers, the meaningful signal is:

1. **`args`** — the exact items input (see §5 for each event's args shape).
2. **Stock events** — the operation fans out one `stock.*` event per affected item
   (see the "Fans out to stock event" column in §5).

The operation event itself only confirms success (`result: true`).

| Event                                    | args key items shape                                         |
|------------------------------------------|--------------------------------------------------------------|
| `receive-inventory-order.received`       | `{ itemId, quantity, batchKey?, locationKey?, loaderKey?, inspectionResult? }` |
| `ship-inventory-order.shipped`           | `{ itemId, quantity }`                                       |
| `ship-inventory-order.ship-cancelled`    | `{ itemId, quantity? }`                                      |
| `transfer-order.transferred`             | `{ itemId, quantity }`                                       |
| `transfer-order.transfer-cancelled`      | `{ itemId, quantity? }`                                      |
| `hold-inventory-order.released`          | `{ aggregatedKey, quantity, unitId? }`                       |
| `allocate-inventory-order.deallocated`   | `{ aggregatedKey, quantity, unitId? }`                       |
| `transfer-customer-order.returned`       | `{ aggregatedKey, quantity, unitId?, locationKey, loaderKey? }` |
| `transfer-vendor-order.returned`         | `{ aggregatedKey, quantity, unitId?, locationKey, loaderKey? }` |

All are passed as `@Args('items', …) items: T[]`, so `args.items` is the array.

---

## 4. The `@nestjs/event-emitter` bridge

Prefer decoupled `@OnEvent` subscribers? Opt into the bridge. It is the only
thing that imports `@nestjs/event-emitter` (an **optional** peer dependency), so
the core module never depends on it.

```ts
import { EventEmitterModule } from '@nestjs/event-emitter';
import { wmsEventEmitterBridgeProvider } from '@rytass/wms-module-graphql/adapters/event-emitter';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    WmsModuleGraphqlModule.forRootAsync({
      ...coreOptions,
      eventEmitterBridge: wmsEventEmitterBridgeProvider,
    }),
  ],
})
export class AppModule {}

// anywhere
@Injectable()
class StockSync {
  @OnEvent('wms.stock.allocated')
  handle(payload: WmsStockEventPayload) { /* ... */ }
}
```

Every event is emitted as `wms.<event-name>` with its payload. `afterListeners`
and the bridge can be used together — both fire.

---

## 5. Complete event list

### Operation events (45) — `<domain>.<past-tense-action>`

The **v2 `result` type** column shows the concrete type subscribers receive via
`WmsOperationResultMap`. Events marked ⚠️ **boolean** are the 9 action mutations
whose `result` is always `true`/`false`; their real signal is `args` + the stock
events they fan out (see §3.1).

| Event                                       | Mutation                      | v2 `result` type                  | Fans out to stock event       |
|---------------------------------------------|-------------------------------|-----------------------------------|-------------------------------|
| `receive-inventory-order.created`           | createReceiveInventoryOrder   | `ReceiveInventoryOrderDto`        | —                             |
| `receive-inventory-order.updated`           | updateReceiveInventoryOrder   | `ReceiveInventoryOrderDto`        | —                             |
| `receive-inventory-order.received`          | receive                       | ⚠️ `boolean`                     | `stock.received`              |
| `ship-inventory-order.created`              | createShipInventoryOrder      | `ShipInventoryOrderDto`           | —                             |
| `ship-inventory-order.updated`              | updateShipInventoryOrder      | `ShipInventoryOrderDto`           | `stock.in-shipment`           |
| `ship-inventory-order.shipped`              | ship                          | ⚠️ `boolean`                     | `stock.shipped`               |
| `ship-inventory-order.ship-cancelled`       | cancelShip                    | ⚠️ `boolean`                     | `stock.shipped` (negative)    |
| `transfer-order.created`                    | createTransferOrder           | `TransferOrderDto`                | `stock.in-transfer`           |
| `transfer-order.updated`                    | updateTransferOrder           | `TransferOrderDto`                | `stock.in-transfer`           |
| `transfer-order.transferred`                | transfer                      | ⚠️ `boolean`                     | `stock.transferred`           |
| `transfer-order.transfer-cancelled`         | cancelTransfer                | ⚠️ `boolean`                     | `stock.in-transfer` (reversal)|
| `hold-inventory-order.created`              | createHoldInventoryOrder      | `HoldInventoryOrderDto`           | `stock.held`                  |
| `hold-inventory-order.updated`              | updateHoldInventoryOrder      | `HoldInventoryOrderDto`           | `stock.held`                  |
| `hold-inventory-order.released`             | release                       | ⚠️ `boolean`                     | `stock.released`              |
| `allocate-inventory-order.created`          | createAllocateInventoryOrder  | `AllocateInventoryOrderDto`       | `stock.allocated`             |
| `allocate-inventory-order.updated`          | updateAllocateInventoryOrder  | `AllocateInventoryOrderDto`       | `stock.allocated`             |
| `allocate-inventory-order.deallocated`      | deallocate                    | ⚠️ `boolean`                     | `stock.deallocated`           |
| `transfer-vendor-order.created`             | createTransferVendorOrder     | `TransferVendorOrderDto`          | `stock.vendor-transferred`    |
| `transfer-vendor-order.updated`             | updateTransferVendorOrder     | `TransferVendorOrderDto`          | `stock.vendor-transferred`    |
| `transfer-vendor-order.returned`            | returnTransferVendorOrder     | ⚠️ `boolean`                     | `stock.vendor-returned`       |
| `transfer-customer-order.created`           | createTransferCustomerOrder   | `TransferCustomerOrderDto`        | `stock.customer-held`         |
| `transfer-customer-order.updated`           | updateTransferCustomerOrder   | `TransferCustomerOrderDto`        | `stock.customer-held`         |
| `transfer-customer-order.returned`          | returnTransferCustomerOrder   | ⚠️ `boolean`                     | `stock.customer-returned`     |
| `quality-inspection-order.inspected`        | inspectMaterials              | `QualityInspectionOrderDto`       | `stock.inspection-resolved`   |
| `scrape-order.scraped`                      | scrapeMaterials               | `ScrapeOrderDto`                  | `stock.scraped`               |
| `reclassify-inventory-order.reclassified`   | reclassifyInventoryOrder      | `ReclassifyInventoryOrderDto`     | `stock.reclassified`          |
| `batch.merged`                              | mergeBatch                    | `MergeBatchOrderDto`              | `stock.merged`                |
| `batch.splitted`                            | splitBatch                    | `SplitBatchOrderDto`              | `stock.splitted`              |
| `material.created`                          | createMaterial                | `MaterialDto`                     | —                             |
| `material.updated`                          | updateMaterial                | `MaterialDto`                     | —                             |
| `loader.created`                            | createLoader                  | `LoaderDto[]`                     | —                             |
| `loader.batch-created`                      | createBatchLoader             | `LoaderDto[]`                     | —                             |
| `loader.updated`                            | updateLoader                  | `LoaderDto`                       | —                             |
| `loader.type-created`                       | createLoaderType              | `LoaderTypeDto`                   | —                             |
| `loader.type-updated`                       | updateLoaderType              | `LoaderTypeDto`                   | —                             |
| `location.created`                          | createLocation                | `LocationDto`                     | —                             |
| `location.updated`                          | updateLocation                | `LocationDto`                     | —                             |
| `warehouse-map.updated`                     | updateWarehouseMap            | `MapDataDto`                      | —                             |

> The "Fans out to stock event" column is **indicative**, not a hard binding. A
> mutation never names a stock event directly — `StockChangeSubscriber` derives
> it from the `*_order_change` table that was written and the sign of
> `quantityChanged`. So a mutation emits a stock event only on the code paths
> that actually write a change row (e.g. an `update*` only when it adds items).
>

Inventory counting adds seven. Only `settled` moves stock; the rest record progress
through the count, which is what makes them useful for an audit trail of who counted
what and when.

| Event                                | Mutation                   | v2 `result` type                     | Fans out to stock event                     |
|--------------------------------------|----------------------------|--------------------------------------|---------------------------------------------|
| `inventory-count-order.created`      | createInventoryCountOrder  | `InventoryCountOrderDto`             | —                                           |
| `inventory-count-order.updated`      | updateInventoryCountOrder / addInventoryCountItem / removeInventoryCountItem | `InventoryCountOrderDto` \| `InventoryCountOrderItemDto` | —                        |
| `inventory-count-order.started`      | startInventoryCount        | `InventoryCountOrderDto`             | — (snapshots the ledger, locks the scope)   |
| `inventory-count-order.counted`      | countInventory             | `InventoryCountOrderDto`             | —                                           |
| `inventory-count-order.reset`        | resetInventoryCount        | `InventoryCountOrderDto`             | —                                           |
| `inventory-count-order.cancelled`    | cancelInventoryCount       | `InventoryCountOrderDto`             | — (releases the lock)                       |
| `inventory-count-order.settled`      | settleInventoryCount       | `InventoryCountOrderDto`             | `stock.count-gained` / `stock.count-lost`   |

> The "v2 `result` type" column refers to the typed overlay provided by
> `WmsOperationResultMap` (exported from `@rytass/wms-module-graphql`). In v1
> `result` is typed `unknown`; consumer code using the typed maps gets the
> concrete DTO automatically.

### Stock domain events (20) — `stock.<change-type>`

`stock.received`, `stock.in-shipment`, `stock.shipped`, `stock.in-transfer`,
`stock.transferred`, `stock.vendor-transferred`, `stock.vendor-returned`,
`stock.held`, `stock.released`, `stock.customer-held`,
`stock.customer-returned`, `stock.splitted`, `stock.merged`, `stock.allocated`,
`stock.deallocated`, `stock.reclassified`, `stock.scraped`,
`stock.count-gained`, `stock.count-lost`, `stock.inspection-resolved`.

19 of them map 1:1 to `ChangeType`. `stock.inspection-resolved` has no
`ChangeType` (quality inspection only flips the `inspectionResult` flag) and
carries `changeType: null` plus `inspectionResult`.

`stock.count-gained` / `stock.count-lost` are emitted only by
`settleInventoryCount`, one per line whose counted quantity differed from the
books — a line that matched writes no change row and therefore no event.

A single operation can emit **several** stock events — one per `*_order_change`
row written, i.e. one per affected item. Cancellations re-use the forward event
with a negative `quantityDelta` (`cancelShip` -> `stock.shipped`,
`cancelTransfer` -> `stock.in-transfer`); branch on the sign, not the name only.

---

## 6. Payloads

### Operation event — `WmsOperationEventPayload`

**v1 shape** (currently shipped):

```ts
{
  id: string | null;   // primary id of the operation's order/entity
  result: unknown;     // the mutation's return value (DTO, or boolean for actions)
}
```

**v2 shape** (upcoming minor — `core@0.3.0` / `graphql@0.6.0`):

```ts
{
  readonly id: string | null;                          // (unchanged) primary id
  readonly result: TResult;                            // now per-event typed via WmsOperationResultMap
  readonly args: Readonly<Record<string, unknown>>;    // NEW — the GraphQL input (intent)
  readonly actor: WmsActor | null;                     // NEW — who performed the mutation
}
```

**`WmsActor`** shape:

```ts
interface WmsActor {
  readonly id: string;       // subject identifier
  readonly domain?: string;  // optional domain / tenant discriminator
  readonly raw?: unknown;    // host-specific extras; opaque to the lib
}
```

`actor` is `null` when no `actorExtractor` is configured. The
`memberBaseActorExtractor` helper (from
`@rytass/wms-module-graphql/adapters/member-base`) reads `req.payload` and
returns `{ id, domain }` — the same fields `CasbinGuard` already puts on the
JWT payload.

`WmsBeforeHookContext` also gains `actor` (so before-hooks can veto by identity):

```ts
interface WmsBeforeHookContext<N extends WmsEventName> {
  event: N;
  args: Record<string, unknown>;
  executionContext: ExecutionContext;
  actor: WmsActor | null;           // v2 addition
}
```

### Typed result overlay — `WmsOperationResultMap`

The v2 graphql package exports a `WmsOperationResultMap` interface that maps
every operation event name to its concrete `result` type. Consumers who use the
typed `beforeHooks` / `afterListeners` maps automatically receive the resolved
DTO instead of `unknown`:

```ts
// listener receives ShipInventoryOrderDto, not unknown
afterListeners: {
  'ship-inventory-order.updated': async ({ payload }) => {
    console.log(payload.result.id);    // typed as string
  },
  // listener receives boolean
  'ship-inventory-order.shipped': async ({ payload }) => {
    console.log(payload.result);       // typed as boolean
    console.log(payload.args);         // { items: [{ itemId, quantity }, ...] }
    console.log(payload.actor?.id);    // actor id if actorExtractor is set
  },
}
```

---

### Stock event — `WmsStockEventPayload`

**Lazy shape** (default — unchanged):

```ts
{
  readonly orderId: string;                // = change.id; correlation id with the operation event
  readonly itemId: string;                 // = change.itemId
  readonly quantityDelta: number;          // = change.quantityChanged (sign = direction)
  readonly changeType: ChangeType | null;  // null only for stock.inspection-resolved
  readonly inspectionResult?: boolean | null; // present only on stock.inspection-resolved
}
```

**Enriched shape** (opt-in, `enrichStockEvents: true`):

The following fields are appended when the flag is enabled. They are loaded in
the **same transaction** via a single indexed PK lookup on the change's item row:

```ts
  readonly materialId?: string | null;
  readonly batchId?: string | null;
  readonly locationId?: string | null;
  readonly loaderId?: string | null;
```

> All four fields are optional/nullable — a `null` value means the column is
> nullable in the underlying order-item row and happened to be null at the time
> of the change. On any lookup error the system degrades to the lazy payload.

**Per-domain enrichment completeness** (`enrichStockEvents: true`):

| Domain (stock event)                              | materialId | batchId | locationId | loaderId |
|---------------------------------------------------|:----------:|:-------:|:----------:|:--------:|
| receive (`stock.received`)                        | yes        | yes *   | yes *      | yes *    |
| ship (`stock.in-shipment` / `stock.shipped`)      | yes        | yes     | yes *      | yes *    |
| transfer-order (`stock.in-transfer` / `.transferred`) | yes    | yes     | yes        | yes *    |
| transfer-vendor (`stock.vendor-*`)                | yes        | yes     | yes *      | yes *    |
| transfer-customer (`stock.customer-*`)            | yes        | yes     | yes *      | yes *    |
| hold (`stock.held` / `stock.released`)            | yes        | yes     | yes *      | yes *    |
| allocate (`stock.allocated` / `.deallocated`)     | yes        | yes     | yes *      | yes *    |
| scrape (`stock.scraped`)                          | yes        | yes     | yes *      | yes *    |
| quality-inspection (`stock.inspection-resolved`)  | yes        | yes     | yes *      | yes *    |
| **split (`stock.splitted`)**                      | **no**     | **no**  | yes *      | yes *    |
| **merge (`stock.merged`)**                        | **no**     | **no**  | yes        | yes *    |
| **reclassify (`stock.reclassified`)**             | **no**     | **no**  | yes        | yes *    |

`*` = column is nullable; may be `null` even when enrichment is on.

> **Important**: split / merge / reclassify order-items have **no `materialId` /
> `batchId`** — those domains operate at batch-aggregation level and keep that
> metadata on the parent order, not the item. With `enrichStockEvents: true`
> these three event types only receive `locationId` / `loaderId`. If you need
> `materialId` / `batchId` for these domains, look them up from the parent order
> by `orderId` inside your after-listener.

---

`orderId` is the same on the operation event (`payload.id`) and the stock events
it fans out to, so listeners can correlate the two tiers. For richer
batch/material/location details when `enrichStockEvents` is off, look them up by
`orderId` / `itemId` inside the after-listener — the data is committed by then.

---

## 7. Guarantees & limitations

- **Post-commit, in-order.** After-listeners fire strictly after commit, in
  collection order, with the operation event last.
- **Veto is side-effect-free.** A throwing before-hook runs before any
  transaction; nothing is written.
- **Listener isolation.** A throwing after-listener is logged and skipped; it
  never rolls back the (already committed) mutation or blocks other listeners.
- **In-process, not persistent.** If the process crashes after commit but before
  flush, those events are lost. This is an in-process event bus, not an
  at-least-once outbox. If you need durable delivery, persist inside your
  after-listener is *not* enough — use an external CDC/outbox.
- **"Handler resolve = post-commit" invariant.** Relies on every mutation
  resolver `await`-ing all its writes (it does today). Never fire-and-forget an
  un-awaited DB write inside a mutation.
- **Uneven transaction boundaries.** `receive*` wrap the transaction at the
  resolver, `ship/transfer/cancel*/reclassify/merge/split` at the service, and
  the `create/update` series have no explicit transaction (multiple awaits).
  Events for the no-transaction operations fire after the writes complete, but
  those operations were never atomic to begin with.

---

## 8. Public API

From the package root (`@rytass/wms-module-graphql`, re-exported from
`@rytass/wms-module-core`):

| Export                                                            | Kind      | Purpose                                                                                                      |
|-------------------------------------------------------------------|-----------|--------------------------------------------------------------------------------------------------------------|
| `WmsMutationEvent({ event })`                                     | decorator | Annotates a mutation (already applied across the library).                                                    |
| `WmsBeforeHookMap` / `WmsAfterListenerMap`                        | type      | The `beforeHooks` / `afterListeners` option shapes.                                                           |
| `WmsEventModuleOptions`                                           | type      | `{ beforeHooks?, afterListeners?, actorExtractor?, enrichStockEvents? }` (part of `forRootAsync`).            |
| `WmsBeforeHookContext` / `WmsAfterEventContext`                    | type      | Hook/listener argument shapes (v2: `WmsBeforeHookContext` gains `actor`).                                     |
| `WmsDomainEvent`                                                  | type      | `{ name, payload }`.                                                                                          |
| `WmsEventName` / `WmsOperationEventName` / `WmsStockEventName`    | type      | Event-name unions.                                                                                            |
| `WmsEventPayloadMap`                                              | type      | Event name -> payload mapping.                                                                                |
| `WmsOperationEventPayload`                                        | type      | `{ id, result, args, actor }` (v2); `{ id, result }` in v1.                                                  |
| `WmsStockEventPayload`                                            | type      | `{ orderId, itemId, quantityDelta, changeType, inspectionResult? }` + optional enrich fields (v2).           |
| `WmsActor`                                                        | type      | `{ id: string; domain?: string; raw?: unknown }` — actor identity shape (v2).                                |
| `WmsActorExtractor`                                               | type      | `(context: ExecutionContext) => WmsActor \| null` — injected via `forRootAsync({ actorExtractor })` (v2).    |
| `WmsOperationResultMap`                                           | type      | Event name → concrete `result` DTO mapping; enables per-event typed listeners (v2, lives in graphql lib).    |

From the adapter subpath (`@rytass/wms-module-graphql/adapters/event-emitter`):

| Export                        | Kind     | Purpose                                                                                               |
|-------------------------------|----------|-------------------------------------------------------------------------------------------------------|
| `wmsEventEmitterBridgeProvider` | provider | Pass to `forRootAsync({ eventEmitterBridge })` to fan events onto `@nestjs/event-emitter`.          |

From the adapter subpath (`@rytass/wms-module-graphql/adapters/member-base`):

| Export                      | Kind      | Purpose                                                                                                   |
|-----------------------------|-----------|-----------------------------------------------------------------------------------------------------------|
| `memberBaseActorExtractor`  | extractor | `WmsActorExtractor` that reads `req.payload` → `{ id, domain }` (v2). Pass to `forRootAsync({ actorExtractor })`. |

`forRootAsync` accepts `beforeHooks`, `afterListeners`, `eventEmitterBridge`,
`actorExtractor`, and `enrichStockEvents` on its single options object — all
optional. Omitting `actorExtractor` leaves `actor: null` on every payload;
omitting `enrichStockEvents` (or setting it `false`) keeps the lazy stock
payload shape.

---

See also: [Authorization](./authorization.md) · [API Reference](./api-reference.md) · [Integration Guide](./integration-guide.md)
