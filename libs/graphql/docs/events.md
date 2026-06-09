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
import { ForbiddenException } from '@nestjs/common';

WmsModuleGraphqlModule.forRootAsync({
  useFactory: async () => ({}),
  defaultLoaderSerialId: 'DEFAULT',
  defaultLoaderTypeKey: 'DEFAULT',
  defaultLocationKey: 'DEFAULT',

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
    'ship-inventory-order.shipped': async ({ payload }) => {
      await erp.markShipped(payload.id, payload.result);
    },
    'stock.allocated': async ({ payload }) => {
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

### Operation events (38) — `<domain>.<past-tense-action>`

| Event | Mutation | Fans out to stock event |
|---|---|---|
| `receive-inventory-order.created` | createReceiveInventoryOrder | — |
| `receive-inventory-order.updated` | updateReceiveInventoryOrder | — |
| `receive-inventory-order.received` | receive | `stock.received` |
| `ship-inventory-order.created` | createShipInventoryOrder | — |
| `ship-inventory-order.updated` | updateShipInventoryOrder | `stock.in-shipment` |
| `ship-inventory-order.shipped` | ship | `stock.shipped` |
| `ship-inventory-order.ship-cancelled` | cancelShip | `stock.shipped` (negative) |
| `transfer-order.created` | createTransferOrder | `stock.in-transfer` |
| `transfer-order.updated` | updateTransferOrder | `stock.in-transfer` |
| `transfer-order.transferred` | transfer | `stock.transferred` |
| `transfer-order.transfer-cancelled` | cancelTransfer | `stock.in-transfer` (reversal) |
| `hold-inventory-order.created` | createHoldInventoryOrder | `stock.held` |
| `hold-inventory-order.updated` | updateHoldInventoryOrder | `stock.held` |
| `hold-inventory-order.released` | release | `stock.released` |
| `allocate-inventory-order.created` | createAllocateInventoryOrder | `stock.allocated` |
| `allocate-inventory-order.updated` | updateAllocateInventoryOrder | `stock.allocated` |
| `allocate-inventory-order.deallocated` | deallocate | `stock.deallocated` |
| `transfer-vendor-order.created` | createTransferVendorOrder | `stock.vendor-transferred` |
| `transfer-vendor-order.updated` | updateTransferVendorOrder | `stock.vendor-transferred` |
| `transfer-vendor-order.returned` | returnTransferVendorOrder | `stock.vendor-returned` |
| `transfer-customer-order.created` | createTransferCustomerOrder | `stock.customer-held` |
| `transfer-customer-order.updated` | updateTransferCustomerOrder | `stock.customer-held` |
| `transfer-customer-order.returned` | returnTransferCustomerOrder | `stock.customer-returned` |
| `quality-inspection-order.inspected` | inspectMaterials | `stock.inspection-resolved` |
| `scrape-order.scraped` | scrapeMaterials | `stock.scraped` |
| `reclassify-inventory-order.reclassified` | reclassifyInventoryOrder | `stock.reclassified` |
| `batch.merged` | mergeBatch | `stock.merged` |
| `batch.splitted` | splitBatch | `stock.splitted` |
| `material.created` | createMaterial | — |
| `material.updated` | updateMaterial | — |
| `loader.created` | createLoader | — |
| `loader.batch-created` | createBatchLoader | — |
| `loader.updated` | updateLoader | — |
| `loader.type-created` | createLoaderType | — |
| `loader.type-updated` | updateLoaderType | — |
| `location.created` | createLocation | — |
| `location.updated` | updateLocation | — |
| `warehouse-map.updated` | updateWarehouseMap | — |

> The "Fans out to stock event" column is **indicative**, not a hard binding. A
> mutation never names a stock event directly — `StockChangeSubscriber` derives
> it from the `*_order_change` table that was written and the sign of
> `quantityChanged`. So a mutation emits a stock event only on the code paths
> that actually write a change row (e.g. an `update*` only when it adds items).

### Stock domain events (18) — `stock.<change-type>`

`stock.received`, `stock.in-shipment`, `stock.shipped`, `stock.in-transfer`,
`stock.transferred`, `stock.vendor-transferred`, `stock.vendor-returned`,
`stock.held`, `stock.released`, `stock.customer-held`,
`stock.customer-returned`, `stock.splitted`, `stock.merged`, `stock.allocated`,
`stock.deallocated`, `stock.reclassified`, `stock.scraped`,
`stock.inspection-resolved`.

The first 17 map 1:1 to `ChangeType`. `stock.inspection-resolved` has no
`ChangeType` (quality inspection only flips the `inspectionResult` flag) and
carries `changeType: null` plus `inspectionResult`.

A single operation can emit **several** stock events — one per `*_order_change`
row written, i.e. one per affected item. Cancellations re-use the forward event
with a negative `quantityDelta` (`cancelShip` -> `stock.shipped`,
`cancelTransfer` -> `stock.in-transfer`); branch on the sign, not the name only.

---

## 6. Payloads

**Operation event** — `WmsOperationEventPayload`:

```ts
{ id: string | null;   // primary id of the operation's order/entity
  result: unknown }     // the mutation's return value (DTO, or boolean for actions)
```

**Stock event** — `WmsStockEventPayload`:

```ts
{ orderId: string;            // = change.id; correlation id with the operation event
  itemId: string;             // = change.itemId
  quantityDelta: number;      // = change.quantityChanged (sign = direction)
  changeType: ChangeType | null;          // null only for stock.inspection-resolved
  inspectionResult?: boolean | null }     // present only on stock.inspection-resolved
```

`orderId` is the same on the operation event (`payload.id`) and the stock events
it fans out to, so listeners can correlate the two tiers. For richer
batch/material/location details, look them up by `orderId` / `itemId` inside the
after-listener — the data is committed by then.

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

| Export | Kind | Purpose |
|---|---|---|
| `WmsMutationEvent({ event })` | decorator | Annotates a mutation (already applied across the library). |
| `WmsBeforeHookMap` / `WmsAfterListenerMap` | type | The `beforeHooks` / `afterListeners` option shapes. |
| `WmsEventModuleOptions` | type | `{ beforeHooks?, afterListeners? }` (part of `forRootAsync`). |
| `WmsBeforeHookContext` / `WmsAfterEventContext` | type | Hook/listener argument shapes. |
| `WmsDomainEvent` | type | `{ name, payload }`. |
| `WmsEventName` / `WmsOperationEventName` / `WmsStockEventName` | type | Event-name unions. |
| `WmsEventPayloadMap` | type | Event name -> payload mapping. |
| `WmsOperationEventPayload` / `WmsStockEventPayload` | type | Payload shapes. |

From the adapter subpath (`@rytass/wms-module-graphql/adapters/event-emitter`):

| Export | Kind | Purpose |
|---|---|---|
| `wmsEventEmitterBridgeProvider` | provider | Pass to `forRootAsync({ eventEmitterBridge })` to fan events onto `@nestjs/event-emitter`. |

`forRootAsync` accepts `beforeHooks`, `afterListeners` and `eventEmitterBridge`
on its single options object — all optional.

---

See also: [Authorization](./authorization.md) · [API Reference](./api-reference.md) · [Integration Guide](./integration-guide.md)
