# Using the core as a host's stock ledger

This guide is for a NestJS application that uses `@rytass/wms-module-core` **as a
service layer only** — no `@rytass/wms-module-graphql`, no React pages — and puts
WMS movements in the same database transactions as its own writes.

It covers five things a host has to get right, in the order it meets them:

1. [Table prefix](#1-table-prefix) — keep WMS tables out of your namespace
2. [Transactions](#2-joining-the-hosts-transaction) — one commit for WMS and your own rows
3. [Events](#3-events-after-commit) — when `stock.*` and operation events fire
4. [Concurrency](#4-concurrent-deductions) — what stops two deductions overselling
5. [Counters and startup](#5-counters-and-startup) — order keys, loader serials, default rows

## 1. Table prefix

Every table declared by this package and by `@rytass/wms-base-nestjs-module`
can carry a prefix, so `locations` becomes `wms_locations` and leaves your own
`locations` alone. The default is no prefix, which is what every existing
deployment has.

```ts
import { withWmsTablePrefix } from '@rytass/wms-module-core';

// apps/api/src/app/app.module.ts — the runtime DataSource
TypeOrmModule.forRootAsync({
  useFactory: () => withWmsTablePrefix({ type: 'postgres', /* … */ }, 'wms_'),
}),
WmsModuleCoreModule.forRootAsync({
  useFactory: () => ({}),
  defaultLoaderSerialId: 'DEFAULT',
  defaultLoaderTypeKey: 'DEFAULT',
  defaultLocationKey: 'DEFAULT',
  tablePrefix: 'wms_', // a check, see below
}),

// apps/api/src/database/data-source.ts — the migration CLI's DataSource
export default new DataSource(withWmsTablePrefix({ type: 'postgres', /* … */ }, 'wms_'));
```

**Wrap every `DataSource` the host builds.** The migration CLI loads
`data-source.ts` in a process of its own; forget it there and `migration:generate`
proposes renaming every WMS table back. The runtime one is checked for you:
with `tablePrefix` set, the module refuses to start when the tables did not end
up prefixed.

How it works, and what it does not touch:

- TypeORM reads table names from decorator metadata when a `DataSource`
  initialises, not when the decorator runs. `withWmsTablePrefix` rewrites that
  metadata in place before the first `DataSource` initialises — no environment
  variable, no import-order rule.
- WMS entities are recognised by **class identity**, never by name. A host
  `class LocationEntity` on `@Entity('locations')` — exactly what the base
  package declares — is a different class and keeps its name.
- String relation targets declared on WMS entities (`@ManyToOne('locations')`)
  are rewritten with the table, so your own `locations` cannot capture them.
- Your `namingStrategy` is not replaced. Every primary key, foreign key and
  index name it derives for **your** entities is byte-for-byte what it was;
  WMS constraint names follow the prefixed table names.
- A `@ChildEntity()` of a WMS root (an entity override) shares the root's table
  and is prefixed with it.
- TypeORM's metadata storage is **process-global**: every `DataSource` in one
  process sees the same prefix. Calling it again with the same prefix is a
  no-op; a different prefix throws.
- Counters stored as PostgreSQL sequences take the prefix too
  (`wms_TO_20261102`, `wms_P_SEQ`).

## 2. Joining the host's transaction

Every public method that writes `stocks` or a `*_order_changes` row takes an
optional `EntityManager` — as the trailing argument, or as `manager` inside the
options object for the methods that already took one (`createReceiveInventoryOrder`,
`updateTransferOrder`, `createLoader`, …):

```ts
await dataSource.transaction(async (manager) => {
  await transferOrderService.transfer({ itemId, quantity: 5 }, manager);
  await outbox.save({ … }, manager);          // your own row
  await requisitions.markPosted(id, manager); // your own row
});
// all three commit together, or none does
```

- A manager inside an active transaction is used as is: no savepoint, no second
  connection.
- A manager **without** a transaction (`dataSource.manager`) gets one opened on
  it; no manager at all opens one on the data source. Either way the method is
  atomic on its own, as before.
- The helper behind this is exported as `runInTransaction(dataSource, manager, work)`
  for a host writing its own order family.

## 3. Events after commit

`stock.*` events are collected by a TypeORM subscriber and operation events by
`WmsOperationRunner`; both are flushed by the **outermost** `runner.run`. So put
the runner **outside** your transaction:

```ts
await runner.run({}, () =>
  dataSource.transaction((manager) => consumptionOrderService.issue(input, manager)),
);
```

- Runner outside the transaction: listeners run after commit; a rollback
  delivers nothing.
- Runner inside the transaction: listeners run before your commit — they can
  observe, and act on, a movement that is then rolled back.
- No runner: stock events have nowhere to go and are dropped.

## 4. Concurrent deductions

Every deduction takes a transaction-scoped advisory lock on the
**(material, batch)** it draws from before it sums what is available, so of two
transactions deducting the same stock the second waits for the first to commit
and then sees its deduction. Multi-line operations lock all their source batches
up front, deduplicated and sorted, so overlapping operations acquire them in the
same order.

- The lock key is (material, batch), not the full slot: a check names location
  and loader only when the caller does, and a finer key would let a check across
  locations run beside one at a single location over the same rows.
  The flip side: a host that keeps one default batch per material serialises
  every deduction of that material, across all locations. Give batches real
  keys if that queue matters.
- It relies on **READ COMMITTED** (PostgreSQL's default). Under REPEATABLE READ
  or SERIALIZABLE the waiting transaction's snapshot predates the first commit
  and still sees the old total.
- `StockService.lockStockSlots(slots, manager)` is public, for a host's own order
  family. Call it once, before the item loop, with every (material, batch) the
  operation draws from. It and `validateStockAvailability` take a **required**
  manager and **throw** unless it is inside an active transaction — in autocommit
  the lock would be released by the statement that took it, before the check it
  guards. A slot without a `materialId` or `batchId` throws as well.
- Splitting a batch (`BatchService.splitBatch`) locks the batch's group, so two
  transactions asking for the same child state share one child. Take stock locks
  before splitting, never after.
- Two host transactions that take WMS locks and locks of their own in opposite
  orders can still deadlock. PostgreSQL detects it and aborts one with
  `40P01`; retry it.

`allowNegativeStock` (a `@rytass/wms-base-nestjs-module` option) has no effect on
this package: the core never goes through the base `OrderService`, and every
deduction here is checked by `validateStockAvailability`.

## 5. Counters and startup

### Order keys and loader serials

`sequenceStorage` chooses where they are counted:

| value | storage | runtime DDL | rollback | use when |
| --- | --- | --- | --- | --- |
| `'sequence'` (default) | one PostgreSQL sequence per counter | `CREATE SEQUENCE IF NOT EXISTS` on first use, on a second connection (once per counter per process) | number consumed | existing deployments |
| `'table'` | rows of the `sequences` table | none | number returned | schema changes only through migrations |

`'table'` mode advances a counter with one
`INSERT … ON CONFLICT DO UPDATE … RETURNING`; its row lock is held to commit, so
callers of one counter queue behind each other. It starts from 1 — switching an
existing deployment over would reissue numbers.

Loader serials are reserved as one consecutive run under a lock, so concurrent
`createLoader` calls never issue the same serial (#185).

### Default rows

At startup the module resolves the default loader type, location and loader
named by `defaultLoaderTypeKey` / `defaultLocationKey` / `defaultLoaderSerialId`,
creating any that are missing. The find-or-create holds an advisory lock, so
several instances starting at once create one of each. Pass
`seedDefaults: false` to seed them yourself; startup then fails if they are
missing.
