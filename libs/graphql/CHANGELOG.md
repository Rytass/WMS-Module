## 0.16.2 (2026-11-25)

### 🩹 Fixes

- **core:** refuse consumption order lines naming unknown ids ([#224](https://github.com/Rytass/WMS-Module/issues/224))

### 🧱 Updated Dependencies

- Updated core to 0.14.1

### ❤️ Thank You

- Chia Yu Pai @fantasywind
- Claude Opus 5.5

## 0.16.1 (2026-11-24)

### 🩹 Fixes

- **graphql:** scope dataloader caches to the request ([#249](https://github.com/Rytass/WMS-Module/pull/249))

### ❤️ Thank You

- Chia Yu Pai @fantasywind
- Claude Opus 5.5

## 0.16.0 (2026-11-24)

### 🚀 Features

- **graphql:** material quantities are Float ([#242](https://github.com/Rytass/WMS-Module/pull/242))
- move a loader together with its reserved stock ([#239](https://github.com/Rytass/WMS-Module/pull/239), [#195](https://github.com/Rytass/WMS-Module/issues/195), [#221](https://github.com/Rytass/WMS-Module/issues/221), [#222](https://github.com/Rytass/WMS-Module/issues/222), [#224](https://github.com/Rytass/WMS-Module/issues/224), [#223](https://github.com/Rytass/WMS-Module/issues/223), [#227](https://github.com/Rytass/WMS-Module/issues/227), [#225](https://github.com/Rytass/WMS-Module/issues/225))
- inventory counts that do not lock their locations ([#240](https://github.com/Rytass/WMS-Module/pull/240), [#195](https://github.com/Rytass/WMS-Module/issues/195), [#221](https://github.com/Rytass/WMS-Module/issues/221), [#222](https://github.com/Rytass/WMS-Module/issues/222), [#224](https://github.com/Rytass/WMS-Module/issues/224), [#223](https://github.com/Rytass/WMS-Module/issues/223), [#227](https://github.com/Rytass/WMS-Module/issues/227), [#226](https://github.com/Rytass/WMS-Module/issues/226))
- **core,graphql:** tell cancellations apart from ships and transfers in the ledger ([#232](https://github.com/Rytass/WMS-Module/pull/232), [#195](https://github.com/Rytass/WMS-Module/issues/195), [#221](https://github.com/Rytass/WMS-Module/issues/221), [#222](https://github.com/Rytass/WMS-Module/issues/222))

### 🩹 Fixes

- return stock status from stocks and stock(id) ([#247](https://github.com/Rytass/WMS-Module/pull/247))
- **core:** refuse editing or removing an order line that has moved stock ([#243](https://github.com/Rytass/WMS-Module/pull/243))
- **core:** index batches.groupId ([#238](https://github.com/Rytass/WMS-Module/pull/238), [#195](https://github.com/Rytass/WMS-Module/issues/195), [#221](https://github.com/Rytass/WMS-Module/issues/221), [#222](https://github.com/Rytass/WMS-Module/issues/222), [#224](https://github.com/Rytass/WMS-Module/issues/224), [#223](https://github.com/Rytass/WMS-Module/issues/223), [#227](https://github.com/Rytass/WMS-Module/issues/227), [#230](https://github.com/Rytass/WMS-Module/issues/230))
- **core:** reject non-positive or non-finite unit conversion factors ([#236](https://github.com/Rytass/WMS-Module/pull/236), [#195](https://github.com/Rytass/WMS-Module/issues/195), [#221](https://github.com/Rytass/WMS-Module/issues/221), [#222](https://github.com/Rytass/WMS-Module/issues/222), [#224](https://github.com/Rytass/WMS-Module/issues/224), [#223](https://github.com/Rytass/WMS-Module/issues/223))
- **core:** do quantity arithmetic in decimal ([#237](https://github.com/Rytass/WMS-Module/pull/237), [#195](https://github.com/Rytass/WMS-Module/issues/195), [#221](https://github.com/Rytass/WMS-Module/issues/221), [#222](https://github.com/Rytass/WMS-Module/issues/222), [#224](https://github.com/Rytass/WMS-Module/issues/224), [#223](https://github.com/Rytass/WMS-Module/issues/223), [#227](https://github.com/Rytass/WMS-Module/issues/227))
- **core:** unit-aware order status, complete change log, merge identity, ship line removal ([#235](https://github.com/Rytass/WMS-Module/pull/235), [#195](https://github.com/Rytass/WMS-Module/issues/195), [#221](https://github.com/Rytass/WMS-Module/issues/221), [#222](https://github.com/Rytass/WMS-Module/issues/222), [#224](https://github.com/Rytass/WMS-Module/issues/224), [#223](https://github.com/Rytass/WMS-Module/issues/223))
- **core:** refuse unknown ids and receipts away from their loader ([#233](https://github.com/Rytass/WMS-Module/pull/233), [#195](https://github.com/Rytass/WMS-Module/issues/195), [#221](https://github.com/Rytass/WMS-Module/issues/221), [#222](https://github.com/Rytass/WMS-Module/issues/222), [#224](https://github.com/Rytass/WMS-Module/issues/224), [#223](https://github.com/Rytass/WMS-Module/issues/223))
- **core:** ledger invariants for ship, quantities and loader placement ([#231](https://github.com/Rytass/WMS-Module/pull/231), [#195](https://github.com/Rytass/WMS-Module/issues/195), [#221](https://github.com/Rytass/WMS-Module/issues/221), [#222](https://github.com/Rytass/WMS-Module/issues/222))

### 🧱 Updated Dependencies

- Updated core to 0.14.0

### ❤️ Thank You

- Chia Yu Pai @fantasywind
- Claude Opus 5.5
- Claude Sonnet 5.5

## 0.15.0 (2026-11-20)

### 🚀 Features

- **core,graphql:** look locations up by exact key ([c2d2ebc2](https://github.com/Rytass/WMS-Module/commit/c2d2ebc2))

### 🧱 Updated Dependencies

- Updated core to 0.13.0

### ❤️ Thank You

- Chia Yu Pai @fantasywind
- Claude Opus 5.5

## 0.14.0 (2026-11-20)

### 🚀 Features

- **graphql:** accept scanCode on the stock queries ([48f9aa00](https://github.com/Rytass/WMS-Module/commit/48f9aa00))

### 🧱 Updated Dependencies

- Updated core to 0.12.0

### ❤️ Thank You

- Chia Yu Pai @fantasywind
- Claude Opus 5.5

## 0.13.0 (2026-11-18)

### 🚀 Features

- **graphql:** sort the change history on the server ([be21808b](https://github.com/Rytass/WMS-Module/commit/be21808b))
- **graphql:** sort the ship orders list on the server ([37a27a1e](https://github.com/Rytass/WMS-Module/commit/37a27a1e))
- **graphql:** sort the receive orders list on the server ([a5a3d841](https://github.com/Rytass/WMS-Module/commit/a5a3d841))
- **graphql:** sort the inventory count lists on the server ([ce2c1032](https://github.com/Rytass/WMS-Module/commit/ce2c1032))
- **graphql:** sort the consumption orders list on the server ([285ca9aa](https://github.com/Rytass/WMS-Module/commit/285ca9aa))
- **graphql:** sort the transfer orders list on the server ([adaebec8](https://github.com/Rytass/WMS-Module/commit/adaebec8))
- **graphql:** sort the loader and loader type lists on the server ([69d5414b](https://github.com/Rytass/WMS-Module/commit/69d5414b))
- **graphql:** sort the locations list on the server ([b3bffa32](https://github.com/Rytass/WMS-Module/commit/b3bffa32))
- **graphql:** accept a sort on aggregatedStocks and stocksGroupedByMaterial ([138f9eaf](https://github.com/Rytass/WMS-Module/commit/138f9eaf))
- **core:** accept a composite tiebreaker in applyListSort ([b47380c6](https://github.com/Rytass/WMS-Module/commit/b47380c6))
- **graphql:** add locationMapPreview query ([184de80f](https://github.com/Rytass/WMS-Module/commit/184de80f))
- **graphql:** sort the materials list on the server ([4411dcce](https://github.com/Rytass/WMS-Module/commit/4411dcce))
- **graphql:** add SortOrder enum and SortInput base type ([385eea90](https://github.com/Rytass/WMS-Module/commit/385eea90))
- **core:** add applyListSort helper for server-side list sorting ([dc2c5a9d](https://github.com/Rytass/WMS-Module/commit/dc2c5a9d))

### 🩹 Fixes

- **core:** sort the change history quantity by magnitude ([5717086b](https://github.com/Rytass/WMS-Module/commit/5717086b))
- **core:** give the hold and allocate lists a deterministic order ([efa3cf9f](https://github.com/Rytass/WMS-Module/commit/efa3cf9f))
- **graphql:** look up location mapData by location key ([1ad55088](https://github.com/Rytass/WMS-Module/commit/1ad55088))

### 🧱 Updated Dependencies

- Updated core to 0.11.0

### ❤️ Thank You

- Chia Yu Pai @fantasywind
- Claude Haiku 5.5
- Claude Opus 5.5

## 0.12.1 (2026-11-05)

### 🧱 Updated Dependencies

- Updated core to 0.10.1

## 0.12.0 (2026-11-02)

### 🩹 Fixes

- ⚠️  **core:** refuse a stock lock that cannot protect the deduction ([c2b3fdc0](https://github.com/Rytass/WMS-Module/commit/c2b3fdc0))
- **graphql:** ship CommonJS only, so the package cannot be loaded twice ([40c18bed](https://github.com/Rytass/WMS-Module/commit/40c18bed))
- **core:** paginate the raw receive, ship and change-history lists with offset/limit ([729bde7a](https://github.com/Rytass/WMS-Module/commit/729bde7a))
- **core,graphql:** harden inventory counting — lock both ends, one transaction per call, createdBy ([b322cac1](https://github.com/Rytass/WMS-Module/commit/b322cac1))

### ⚠️  Breaking Changes

- **core:** refuse a stock lock that cannot protect the deduction  ([c2b3fdc0](https://github.com/Rytass/WMS-Module/commit/c2b3fdc0))
  StockService.validateStockAvailability and lockStockSlots
  require an EntityManager inside an active transaction.

### 🧱 Updated Dependencies

- Updated core to 0.10.0

### ❤️ Thank You

- Chia Yu Pai @fantasywind
- Claude Fable 5.1
- Claude Opus 5 (1M context)
- Claude Opus 5.5
- MarshallChiang

## 0.11.1 (2026-09-05)

### 🩹 Fixes

- **graphql:** declare tslib and ship the ESM build as .mjs ([098723b](https://github.com/Rytass/WMS-Module/commit/098723b))

### 🧱 Updated Dependencies

- Updated core to 0.9.1

### ❤️ Thank You

- Chia Yu Pai @fantasywind
- Claude Opus 5 (1M context)

## 0.11.0 (2026-09-05)

### 🚀 Features

- **core:** surface batch lineage and attributes on the aggregated stock ([be1df6c](https://github.com/Rytass/WMS-Module/commit/be1df6c))
- **graphql:** expose the consumption order ([74a68ee](https://github.com/Rytass/WMS-Module/commit/74a68ee))
- ⚠️  **core:** give a direct service call the same event guarantee as a mutation ([3914c32](https://github.com/Rytass/WMS-Module/commit/3914c32))
- **graphql:** read and write order references ([802ca4e](https://github.com/Rytass/WMS-Module/commit/802ca4e))
- **graphql:** expose excludeLocationIds on the stock queries ([de91544](https://github.com/Rytass/WMS-Module/commit/de91544))
- **graphql:** expose batch attributes through a JSONObject scalar ([088abba](https://github.com/Rytass/WMS-Module/commit/088abba))

### 🩹 Fixes

- **core:** snapshot requiresInspection onto the count sheet ([5fc1963](https://github.com/Rytass/WMS-Module/commit/5fc1963))
- **graphql:** restore per-event typing for inline hook and listener maps ([a8d3990](https://github.com/Rytass/WMS-Module/commit/a8d3990))
- **core:** stop the inspection flag rewriting every default receipt's batch ([7a9bf57](https://github.com/Rytass/WMS-Module/commit/7a9bf57))
- ⚠️  **core:** compare consumption quantities in base units, and guard the target ([59e299b](https://github.com/Rytass/WMS-Module/commit/59e299b))
- **core:** order a paginated consumption order list by a property path ([ebdba4d](https://github.com/Rytass/WMS-Module/commit/ebdba4d))

### ⚠️  Breaking Changes

- **core:** compare consumption quantities in base units, and guard the target  ([59e299b](https://github.com/Rytass/WMS-Module/commit/59e299b))
  `ConsumptionOrderItemProgress` now reports base units on
  every field, including `target`. A consumer reading `target` as the
  number the line was ordered in must divide by the line's conversion
  factor. Nothing changes for a line already in its base unit.
- **core:** give a direct service call the same event guarantee as a mutation  ([3914c32](https://github.com/Rytass/WMS-Module/commit/3914c32))
  `WmsBeforeHookContext.executionContext` is now
  `ExecutionContext | null`, with a `source: 'graphql' | 'host'`
  discriminant beside it. A direct service call has no execution context,
  and fabricating one would hand a hook a lie instead of an obvious null.
  A hook that reaches into the request should branch on `source` first.
  The same widening applies to `WmsTypedBeforeHookContext`.

### 🧱 Updated Dependencies

- Updated core to 0.9.0

### ❤️ Thank You

- Chia Yu Pai @fantasywind
- Claude Opus 5

## 0.10.2 (2026-09-01)

### 🧱 Updated Dependencies

- Updated core to 0.8.1

## 0.10.1 (2026-09-01)

### 🚀 Features

- **core:** support TypeORM 1.x alongside 0.3.x ([ca25f8d](https://github.com/Rytass/WMS-Module/commit/ca25f8d))

### 🧱 Updated Dependencies

- Updated core to 0.8.0

### ❤️ Thank You

- Chia Yu Pai @fantasywind
- Claude Opus 5

## 0.10.0 (2026-09-01)

### 🚀 Features

- **graphql:** expose the batch attribute filters on every stock query ([37bad6d](https://github.com/Rytass/WMS-Module/commit/37bad6d))
- **graphql:** add a filtered, paginated count sheet query ([e25aeed](https://github.com/Rytass/WMS-Module/commit/e25aeed))
- **core:** snapshot the batch attributes a count sheet displays ([6ff7487](https://github.com/Rytass/WMS-Module/commit/6ff7487))

### 🩹 Fixes

- **deps:** declare every package the published bundles actually require ([02aea88](https://github.com/Rytass/WMS-Module/commit/02aea88))
- **deps:** correct two runtime dependency ranges that nothing was validating ([d7ed0c0](https://github.com/Rytass/WMS-Module/commit/d7ed0c0))
- **repo:** make the pre-publish gate able to fail, and stop packing src twice ([f45a681](https://github.com/Rytass/WMS-Module/commit/f45a681))
- **deps:** widen the published peer ranges to match what the code actually uses ([c9bd621](https://github.com/Rytass/WMS-Module/commit/c9bd621))

### 🧱 Updated Dependencies

- Updated core to 0.7.0

### ❤️ Thank You

- Chia Yu Pai @fantasywind
- Claude Opus 5

## 0.9.0 (2026-08-31)

### 🚀 Features

- **graphql:** expose the inventory count API ([419e2a5](https://github.com/Rytass/WMS-Module/commit/419e2a5))
- **graphql:** let a deployment unregister operations ([dc55f77](https://github.com/Rytass/WMS-Module/commit/dc55f77))

### 🧱 Updated Dependencies

- Updated core to 0.6.0

### ❤️ Thank You

- Chia Yu Pai @fantasywind
- Claude Opus 5

## 0.8.0 (2026-08-27)

### 🚀 Features

- **graphql:** resolve every dataloader through the configured entities ([e2859aa](https://github.com/Rytass/WMS-Module/commit/e2859aa))

### 🧱 Updated Dependencies

- Updated core to 0.5.0

### ❤️ Thank You

- Chia Yu Pai @fantasywind
- Claude Opus 5

## 0.7.0 (2026-08-27)

### 🚀 Features

- **graphql:** resolve material dataloaders through the configured entity ([0344ebc](https://github.com/Rytass/WMS-Module/commit/0344ebc))

### 🧱 Updated Dependencies

- Updated core to 0.4.0

### ❤️ Thank You

- Chia Yu Pai @fantasywind
- Claude Opus 5

## 0.6.1 (2026-08-14)

### 🩹 Fixes

- **graphql:** resolve location children through the request-scoped loader ([8b9f8cb](https://github.com/Rytass/WMS-Module/commit/8b9f8cb))

### 🧱 Updated Dependencies

- Updated core to 0.3.1

### ❤️ Thank You

- Chia Yu Pai @fantasywind
- Claude Opus 5

## 0.6.0 (2026-06-30)

### 🚀 Features

- **graphql:** add typed event result map and actor extractor wiring ([1b17299](https://github.com/Rytass/WMS-Module/commit/1b17299))

### 🧱 Updated Dependencies

- Updated core to 0.3.0

### ❤️ Thank You

- Chia Yu Pai @fantasywind
- Claude Opus 4.8

## 0.5.0 (2026-06-09)

### 🚀 Features

- **graphql:** annotate mutations with @WmsMutationEvent ([f04c9f7](https://github.com/Rytass/WMS-Module/commit/f04c9f7))
- **graphql:** add @nestjs/event-emitter bridge entrypoint ([2debfe9](https://github.com/Rytass/WMS-Module/commit/2debfe9))
- **graphql:** add mutation event interceptor and forRootAsync wiring ([c31e6dd](https://github.com/Rytass/WMS-Module/commit/c31e6dd))

### 🧱 Updated Dependencies

- Updated core to 0.2.0

### ❤️ Thank You

- Chia Yu Pai @fantasywind
- Claude Opus 4.8 (1M context)

## 0.4.0 (2026-06-08)

### 🚀 Features

- **graphql:** annotate root operations with @WmsOperation ([0231fb3](https://github.com/Rytass/WMS-Module/commit/0231fb3))
- **graphql:** add member-base authChecker adapter ([41d3540](https://github.com/Rytass/WMS-Module/commit/41d3540))
- **graphql:** add host-neutral resolver authorization layer ([fdf2aeb](https://github.com/Rytass/WMS-Module/commit/fdf2aeb))

### ❤️ Thank You

- Chia Yu Pai @fantasywind
- Claude Opus 4.8 (1M context)

## 0.3.0 (2026-06-08)

### 🚀 Features

- **graphql:** make createWmsLoaders return spreadable context fragment ([064865f](https://github.com/Rytass/WMS-Module/commit/064865f))

### ❤️ Thank You

- Chia Yu Pai @fantasywind
- Claude Opus 4.7

## 0.2.0 (2026-06-04)

### 🚀 Features

- **graphql:** expose providers for user-driven GraphQLModule composition ([325c019](https://github.com/Rytass/WMS-Module/commit/325c019))

### 🧱 Updated Dependencies

- Updated core to 0.1.6

### ❤️ Thank You

- Chia Yu Pai @fantasywind
- Claude Opus 4.7

## 0.1.5 (2026-05-31)

This was a version bump only for graphql to align it with other projects, there were no code changes.

## 0.1.4 (2026-05-31)

### 🩹 Fixes

- **graphql:** tighten @nestjs/apollo peer range to avoid Apollo Server v5 mismatch ([40da215](https://github.com/Rytass/WMS-Module/commit/40da215))

### ❤️ Thank You

- Chia Yu Pai @fantasywind
- Claude Sonnet 4.6

## 0.1.3 (2026-05-30)

This was a version bump only for graphql to align it with other projects, there were no code changes.

## 0.1.2 (2026-05-30)

This was a version bump only for graphql to align it with other projects, there were no code changes.

## 0.1.1 (2026-05-30)

### 🩹 Fixes

- **graphql:** pin lru-cache to v10+ for runtime compatibility ([159d37f](https://github.com/Rytass/WMS-Module/commit/159d37f))
- **graphql:** declare @as-integrations/express5 as peer dependency ([f5981af](https://github.com/Rytass/WMS-Module/commit/f5981af))

### ❤️ Thank You

- Chia Yu Pai @fantasywind
- Claude Sonnet 4.6

## 0.1.0 (2026-05-30)

### 🚀 Features

- **libs:** add package exports and typesVersions for npm publishing ([fd53a37](https://github.com/Rytass/WMS-Module/commit/fd53a37))
- **graphql:** make libs/graphql publishable as @rytass/wms-module-graphql ([d7e2721](https://github.com/Rytass/WMS-Module/commit/d7e2721))
- **api:** available loader query ([b34394c](https://github.com/Rytass/WMS-Module/commit/b34394c))
- **api:** add totalQuantity in loader dto ([bdc7a3c](https://github.com/Rytass/WMS-Module/commit/bdc7a3c))
- **api:** add loaderTypeKey and locationKey in loaders query ([fe7891e](https://github.com/Rytass/WMS-Module/commit/fe7891e))
- **api:** add wildcard search key in ship/receive/transfer findmany ([60a2e56](https://github.com/Rytass/WMS-Module/commit/60a2e56))
- **api:** default root location ([925e2e9](https://github.com/Rytass/WMS-Module/commit/925e2e9))
- **api:** add root args in location ([eaedf55](https://github.com/Rytass/WMS-Module/commit/eaedf55))
- **api:** add location children ([c79f51c](https://github.com/Rytass/WMS-Module/commit/c79f51c))
- **api:** add parent to location dto ([daefc90](https://github.com/Rytass/WMS-Module/commit/daefc90))
- **api:** add update location ([feede98](https://github.com/Rytass/WMS-Module/commit/feede98))
- **api:** add location isActive ([883898f](https://github.com/Rytass/WMS-Module/commit/883898f))
- **api:** make cancel quantity optional, cancel the reset remaining items when order removed ([aa5e1aa](https://github.com/Rytass/WMS-Module/commit/aa5e1aa))
- **api:** add cancel transfer and cancel shipment mutations ([8acca85](https://github.com/Rytass/WMS-Module/commit/8acca85))
- **api:** add transferredQuantity and unitId to transfer ordre item ([1105261](https://github.com/Rytass/WMS-Module/commit/1105261))
- **api:** add saleId and saleserialId in ship inv order resolver ([2e40377](https://github.com/Rytass/WMS-Module/commit/2e40377))
- **api:** transferOrder query ([3fa51ea](https://github.com/Rytass/WMS-Module/commit/3fa51ea))
- **api:** add sale fields in transofer order item ([4a98574](https://github.com/Rytass/WMS-Module/commit/4a98574))
- **api:** add receive inventory order insepction result ([670eb2f](https://github.com/Rytass/WMS-Module/commit/670eb2f))
- **api:** quality inspection graphql ([4b426d4](https://github.com/Rytass/WMS-Module/commit/4b426d4))
- **api:** default loader ([a0a8255](https://github.com/Rytass/WMS-Module/commit/a0a8255))
- **api:** setup batch inspectionResult when receive ([e3468a5](https://github.com/Rytass/WMS-Module/commit/e3468a5))
- **api:** use batchKey for receive act ([9e5a063](https://github.com/Rytass/WMS-Module/commit/9e5a063))
- **api:** statuses for receive inv order query ([d6bbd3e](https://github.com/Rytass/WMS-Module/commit/d6bbd3e))
- **api:** add aggregateKey to ship items + add statuses args to ship order query ([90b7408](https://github.com/Rytass/WMS-Module/commit/90b7408))
- **api:** scrape order ([2603a76](https://github.com/Rytass/WMS-Module/commit/2603a76))
- **api:** add wildcard for key searching in ship/ receive order query ([c98d46d](https://github.com/Rytass/WMS-Module/commit/c98d46d))
- **api:** vendor/ customer transfer ([b39c449](https://github.com/Rytass/WMS-Module/commit/b39c449))
- **api:** reclassify order ([f9aac1b](https://github.com/Rytass/WMS-Module/commit/f9aac1b))
- **api:** add unitId in release args ; ([ee55877](https://github.com/Rytass/WMS-Module/commit/ee55877))
- **api:** change logs query updated ([33d96f5](https://github.com/Rytass/WMS-Module/commit/33d96f5))
- **api:** merge/split batch mutation ([c1454ec](https://github.com/Rytass/WMS-Module/commit/c1454ec))
- **api:** merge/split order service ([8aa313c](https://github.com/Rytass/WMS-Module/commit/8aa313c))
- **api:** loader unit query ([1ab3b21](https://github.com/Rytass/WMS-Module/commit/1ab3b21))
- **api:** add sale order query args ([2e9c079](https://github.com/Rytass/WMS-Module/commit/2e9c079))
- **api:** sale order query ([208e904](https://github.com/Rytass/WMS-Module/commit/208e904))
- **api:** ship inv order mutation ([06921c8](https://github.com/Rytass/WMS-Module/commit/06921c8))
- **api:** reference shippedQuantity, material batch added ([3210f0f](https://github.com/Rytass/WMS-Module/commit/3210f0f))
- **api:** use key for ship inventory order create/update ([8075051](https://github.com/Rytass/WMS-Module/commit/8075051))
- **api:** ship inventory order resolvefield ([86ec3c3](https://github.com/Rytass/WMS-Module/commit/86ec3c3))
- **api:** allocated order query ([1cd9e08](https://github.com/Rytass/WMS-Module/commit/1cd9e08))
- **api:** change log id ([1a39fba](https://github.com/Rytass/WMS-Module/commit/1a39fba))
- **api:** wildcard query ([ed937d6](https://github.com/Rytass/WMS-Module/commit/ed937d6))
- **api:** wildcard query ([abe6d23](https://github.com/Rytass/WMS-Module/commit/abe6d23))
- **api:** aggregate key query field ([51ec50d](https://github.com/Rytass/WMS-Module/commit/51ec50d))
- **api:** conversion added ([904855b](https://github.com/Rytass/WMS-Module/commit/904855b))
- **api:** material resolvefield fix ([a0170c5](https://github.com/Rytass/WMS-Module/commit/a0170c5))
- **api:** hold ([1e681e4](https://github.com/Rytass/WMS-Module/commit/1e681e4))
- **api:** transfer ([190c56b](https://github.com/Rytass/WMS-Module/commit/190c56b))
- **api:** transfer order ([180dcf8](https://github.com/Rytass/WMS-Module/commit/180dcf8))
- **api:** transfer order service ([9fe36c1](https://github.com/Rytass/WMS-Module/commit/9fe36c1))
- **api:** key interface ([3c2051e](https://github.com/Rytass/WMS-Module/commit/3c2051e))
- **api:** loader type with key ([00d7c18](https://github.com/Rytass/WMS-Module/commit/00d7c18))
- **api:** aggregated stock ([d3da278](https://github.com/Rytass/WMS-Module/commit/d3da278))
- **api:** add order service of different execution ([02a0ea6](https://github.com/Rytass/WMS-Module/commit/02a0ea6))
- **api:** unit query ([78a1cc3](https://github.com/Rytass/WMS-Module/commit/78a1cc3))
- **api:** transfer order ([b87e062](https://github.com/Rytass/WMS-Module/commit/b87e062))
- **api:** add serialId in loader dto ([f6de96b](https://github.com/Rytass/WMS-Module/commit/f6de96b))
- **api:** add loader types referencec quantity ([bc2191a](https://github.com/Rytass/WMS-Module/commit/bc2191a))
- **api:** loader types compound key like search ([ea1588b](https://github.com/Rytass/WMS-Module/commit/ea1588b))
- **api:** loader types query ([6eaa38b](https://github.com/Rytass/WMS-Module/commit/6eaa38b))
- **api:** add create location ([21d7dae](https://github.com/Rytass/WMS-Module/commit/21d7dae))
- **api:** material unit resolvefield ([f753dac](https://github.com/Rytass/WMS-Module/commit/f753dac))
- **api:** remove actual quantity field ([a7b0e40](https://github.com/Rytass/WMS-Module/commit/a7b0e40))
- **api:** add status trigger ([a5a16e5](https://github.com/Rytass/WMS-Module/commit/a5a16e5))
- **api:** location map setup ([a393696](https://github.com/Rytass/WMS-Module/commit/a393696))
- **api:** warehouse map data ([6379d19](https://github.com/Rytass/WMS-Module/commit/6379d19))
- **api:** module setup ([42c1475](https://github.com/Rytass/WMS-Module/commit/42c1475))
- graphql ([d54cf50](https://github.com/Rytass/WMS-Module/commit/d54cf50))
- **loader:** graphql; ([6374006](https://github.com/Rytass/WMS-Module/commit/6374006))
- **api:** add graphql lib ([99e0717](https://github.com/Rytass/WMS-Module/commit/99e0717))

### 🩹 Fixes

- **graphql:** widen QualityInspectionOrderDto.note to nullable ([fdb008b](https://github.com/Rytass/WMS-Module/commit/fdb008b))
- **release:** prevent staging deploy from breaking on lib publish setup ([1095a25](https://github.com/Rytass/WMS-Module/commit/1095a25))
- **api:** fix arg naming ([9c1a163](https://github.com/Rytass/WMS-Module/commit/9c1a163))
- **api:** location resolve key fixed ([ec6de2f](https://github.com/Rytass/WMS-Module/commit/ec6de2f))
- **api:** seed mapdata id ([2ac4c17](https://github.com/Rytass/WMS-Module/commit/2ac4c17))
- **api:** ship mutation and ship status ([105a66e](https://github.com/Rytass/WMS-Module/commit/105a66e))
- **api:** inspectionResult and batchKey given case fixed ([dc0c7fa](https://github.com/Rytass/WMS-Module/commit/dc0c7fa))
- **api:** quality inspection args type fixed ([ef7b893](https://github.com/Rytass/WMS-Module/commit/ef7b893))
- **api:** fix aggregated ([589d592](https://github.com/Rytass/WMS-Module/commit/589d592))
- **api:** aggregate key issue ([db44277](https://github.com/Rytass/WMS-Module/commit/db44277))
- **api:** fix ship order update removedAt ([f6d9748](https://github.com/Rytass/WMS-Module/commit/f6d9748))
- **api:** fix sale order query args type ([0b99855](https://github.com/Rytass/WMS-Module/commit/0b99855))
- **api:** batch group loader ([d34886c](https://github.com/Rytass/WMS-Module/commit/d34886c))
- **api:** missing select in receive/ship order ([4900389](https://github.com/Rytass/WMS-Module/commit/4900389))
- **api:** material aggregation fixed ([b7dd984](https://github.com/Rytass/WMS-Module/commit/b7dd984))
- **api:** aggregated pagination ([c5435cb](https://github.com/Rytass/WMS-Module/commit/c5435cb))
- **api:** orders query status expressoion fixed ([febe1ff](https://github.com/Rytass/WMS-Module/commit/febe1ff))
- **api:** typing fixed ([4d31b85](https://github.com/Rytass/WMS-Module/commit/4d31b85))

### 🧱 Updated Dependencies

- Updated core to 0.1.0

### ❤️ Thank You

- Chia Yu Pai @fantasywind
- Claude Opus 4.7 (1M context)
- Claude Sonnet 4.6
- MarshallChiang