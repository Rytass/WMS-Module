## 0.10.1 (2026-11-05)

### 🩹 Fixes

- **core:** join entities, not table paths, so schema-qualified hosts work ([9a746147](https://github.com/Rytass/WMS-Module/commit/9a746147))

### ❤️ Thank You

- Chia Yu Pai @fantasywind
- Claude Opus 5.5

## 0.10.0 (2026-11-02)

### 🚀 Features

- **core:** export the service input types ([fc43ce06](https://github.com/Rytass/WMS-Module/commit/fc43ce06))
- **core:** add table prefix, counter service and host startup options ([#185](https://github.com/Rytass/WMS-Module/issues/185))
- **core:** add runInTransaction and metadata-backed table paths ([be1ea53f](https://github.com/Rytass/WMS-Module/commit/be1ea53f))

### 🩹 Fixes

- **core:** page aggregated stocks with offset/limit and a total order ([52174dd5](https://github.com/Rytass/WMS-Module/commit/52174dd5))
- **core:** recognise WMS change tables by class identity, not by name ([c2427498](https://github.com/Rytass/WMS-Module/commit/c2427498))
- **core:** probe a sequence on a second connection only on first use ([e069def3](https://github.com/Rytass/WMS-Module/commit/e069def3))
- **core:** serialise splitBatch on its batch group ([5dbf0a0a](https://github.com/Rytass/WMS-Module/commit/5dbf0a0a))
- ⚠️  **core:** refuse a stock lock that cannot protect the deduction ([c2b3fdc0](https://github.com/Rytass/WMS-Module/commit/c2b3fdc0))
- **core:** lock every source batch before a multi-line consumption or merge ([d3f82c9a](https://github.com/Rytass/WMS-Module/commit/d3f82c9a))
- ⚠️  **core:** take the caller's EntityManager in every write and lock deductions ([#186](https://github.com/Rytass/WMS-Module/issues/186), [#183](https://github.com/Rytass/WMS-Module/issues/183), [#184](https://github.com/Rytass/WMS-Module/issues/184))
- **core:** ship CommonJS only, so the package cannot be loaded twice ([14404b3f](https://github.com/Rytass/WMS-Module/commit/14404b3f))
- **core:** paginate the raw receive, ship and change-history lists with offset/limit ([729bde7a](https://github.com/Rytass/WMS-Module/commit/729bde7a))
- **core,graphql:** harden inventory counting — lock both ends, one transaction per call, createdBy ([b322cac1](https://github.com/Rytass/WMS-Module/commit/b322cac1))

### ⚠️  Breaking Changes

- **core:** refuse a stock lock that cannot protect the deduction  ([c2b3fdc0](https://github.com/Rytass/WMS-Module/commit/c2b3fdc0))
  StockService.validateStockAvailability and lockStockSlots
  require an EntityManager inside an active transaction.
- **core:** take the caller's EntityManager in every write and lock deductions  ([#186](https://github.com/Rytass/WMS-Module/issues/186), [#183](https://github.com/Rytass/WMS-Module/issues/183), [#184](https://github.com/Rytass/WMS-Module/issues/184))
  Receiving with requireInspection false leaves inspectionResult
  null unless the caller passes one.

### ❤️ Thank You

- Chia Yu Pai @fantasywind
- Claude Fable 5.1
- Claude Opus 5 (1M context)
- Claude Opus 5.5
- MarshallChiang

## 0.9.1 (2026-09-05)

### 🩹 Fixes

- **core:** declare tslib and ship the ESM build as .mjs ([6291700](https://github.com/Rytass/WMS-Module/commit/6291700))

### ❤️ Thank You

- Chia Yu Pai @fantasywind
- Claude Opus 5 (1M context)

## 0.9.0 (2026-09-05)

### 🚀 Features

- **core:** publish BaseOrderService ([475c147](https://github.com/Rytass/WMS-Module/commit/475c147))
- **core:** let a host register its own change table for stock events ([72560cc](https://github.com/Rytass/WMS-Module/commit/72560cc))
- **core:** surface batch lineage and attributes on the aggregated stock ([be1df6c](https://github.com/Rytass/WMS-Module/commit/be1df6c))
- **core:** issue, return and settle a consumption order ([191a778](https://github.com/Rytass/WMS-Module/commit/191a778))
- **core:** add the consumption order's tables and change types ([54e095c](https://github.com/Rytass/WMS-Module/commit/54e095c))
- ⚠️  **core:** give a direct service call the same event guarantee as a mutation ([3914c32](https://github.com/Rytass/WMS-Module/commit/3914c32))
- **graphql:** read and write order references ([802ca4e](https://github.com/Rytass/WMS-Module/commit/802ca4e))
- **core:** link an order to the host document it was opened for ([1730b93](https://github.com/Rytass/WMS-Module/commit/1730b93))
- **core:** let stock queries exclude locations ([8ec8176](https://github.com/Rytass/WMS-Module/commit/8ec8176))
- **core:** carry batch lineage and host attributes through a split ([391f565](https://github.com/Rytass/WMS-Module/commit/391f565))

### 🩹 Fixes

- **core:** snapshot requiresInspection onto the count sheet ([5fc1963](https://github.com/Rytass/WMS-Module/commit/5fc1963))
- **core:** refuse a split that names one batch key twice ([7a7f6b1](https://github.com/Rytass/WMS-Module/commit/7a7f6b1))
- **core:** correct the BaseOrderService recipe, and derive the owned tables ([0712ee3](https://github.com/Rytass/WMS-Module/commit/0712ee3))
- **core:** stop the inspection flag rewriting every default receipt's batch ([7a9bf57](https://github.com/Rytass/WMS-Module/commit/7a9bf57))
- ⚠️  **core:** compare consumption quantities in base units, and guard the target ([59e299b](https://github.com/Rytass/WMS-Module/commit/59e299b))
- ⚠️  **core:** stop calling every uninspected batch "awaiting inspection" ([e28de17](https://github.com/Rytass/WMS-Module/commit/e28de17))
- **core:** order a paginated consumption order list by a property path ([ebdba4d](https://github.com/Rytass/WMS-Module/commit/ebdba4d))

### ⚠️  Breaking Changes

- **core:** compare consumption quantities in base units, and guard the target  ([59e299b](https://github.com/Rytass/WMS-Module/commit/59e299b))
  `ConsumptionOrderItemProgress` now reports base units on
  every field, including `target`. A consumer reading `target` as the
  number the line was ordered in must divide by the line's conversion
  factor. Nothing changes for a line already in its base unit.
- **core:** stop calling every uninspected batch "awaiting inspection"  ([e28de17](https://github.com/Rytass/WMS-Module/commit/e28de17))
  Existing rows take the column default `false`, so
  batches that were genuinely awaiting inspection before this upgrade stop
  being reported as such. There is no generic backfill -- `inspectionResult
  IS NULL` is precisely the signal that turned out not to mean this -- so a
  deployment that cares has to derive it from its own receive history.
- **core:** give a direct service call the same event guarantee as a mutation  ([3914c32](https://github.com/Rytass/WMS-Module/commit/3914c32))
  `WmsBeforeHookContext.executionContext` is now
  `ExecutionContext | null`, with a `source: 'graphql' | 'host'`
  discriminant beside it. A direct service call has no execution context,
  and fabricating one would hand a hook a lie instead of an obvious null.
  A hook that reaches into the request should branch on `source` first.
  The same widening applies to `WmsTypedBeforeHookContext`.

### ❤️ Thank You

- Chia Yu Pai @fantasywind
- Claude Opus 5

## 0.8.1 (2026-09-01)

### 🩹 Fixes

- **core:** stop findAggregatedStocks reading an aggregation switch it cannot honour ([bd3c1e1](https://github.com/Rytass/WMS-Module/commit/bd3c1e1))

### ❤️ Thank You

- Chia Yu Pai @fantasywind
- Claude Opus 5

## 0.8.0 (2026-09-01)

### 🚀 Features

- **core:** support TypeORM 1.x alongside 0.3.x ([ca25f8d](https://github.com/Rytass/WMS-Module/commit/ca25f8d))

### 🩹 Fixes

- **core:** match absent batch attributes with IsNull(), not a bare null ([df7f399](https://github.com/Rytass/WMS-Module/commit/df7f399))

### ❤️ Thank You

- Chia Yu Pai @fantasywind
- Claude Opus 5

## 0.7.0 (2026-09-01)

### 🚀 Features

- **core:** filter stock by its batch's vendor, customer and sale order ([d66dfb4](https://github.com/Rytass/WMS-Module/commit/d66dfb4))
- **graphql:** add a filtered, paginated count sheet query ([e25aeed](https://github.com/Rytass/WMS-Module/commit/e25aeed))
- **core:** snapshot the batch attributes a count sheet displays ([6ff7487](https://github.com/Rytass/WMS-Module/commit/6ff7487))

### 🩹 Fixes

- **deps:** declare every package the published bundles actually require ([02aea88](https://github.com/Rytass/WMS-Module/commit/02aea88))
- **repo:** make the pre-publish gate able to fail, and stop packing src twice ([f45a681](https://github.com/Rytass/WMS-Module/commit/f45a681))
- **deps:** widen the published peer ranges to match what the code actually uses ([c9bd621](https://github.com/Rytass/WMS-Module/commit/c9bd621))

### ❤️ Thank You

- Chia Yu Pai @fantasywind
- Claude Opus 5

## 0.6.0 (2026-08-31)

### 🚀 Features

- **core:** add the inventory count domain ([472db44](https://github.com/Rytass/WMS-Module/commit/472db44))
- **core:** publish the operation-name vocabulary ([ea7313e](https://github.com/Rytass/WMS-Module/commit/ea7313e))

### 🩹 Fixes

- **core:** await the warehouse map seed transaction ([a99e913](https://github.com/Rytass/WMS-Module/commit/a99e913))

### ❤️ Thank You

- Chia Yu Pai @fantasywind
- Claude Opus 5

## 0.5.0 (2026-08-27)

### 🚀 Features

- **core:** honour every entity override, not just materialEntity ([9fe691d](https://github.com/Rytass/WMS-Module/commit/9fe691d))

### ❤️ Thank You

- Chia Yu Pai @fantasywind
- Claude Opus 5

## 0.4.0 (2026-08-27)

### 🚀 Features

- **core:** honour the materialEntity option across services and entity symbols ([4fcf7ed](https://github.com/Rytass/WMS-Module/commit/4fcf7ed))

### ❤️ Thank You

- Chia Yu Pai @fantasywind
- Claude Opus 5

## 0.3.1 (2026-08-14)

This was a version bump only for core to align it with other projects, there were no code changes.

## 0.3.0 (2026-06-30)

### 🚀 Features

- **core:** enrich event payloads with actor and stock item ids ([55bad0b](https://github.com/Rytass/WMS-Module/commit/55bad0b))

### ❤️ Thank You

- Chia Yu Pai @fantasywind
- Claude Opus 4.8

## 0.2.0 (2026-06-09)

### 🚀 Features

- **core:** collect stock domain events via TypeORM subscriber ([346e7cb](https://github.com/Rytass/WMS-Module/commit/346e7cb))
- **core:** add mutation event dispatch core ([c927239](https://github.com/Rytass/WMS-Module/commit/c927239))

### ❤️ Thank You

- Chia Yu Pai @fantasywind
- Claude Opus 4.8 (1M context)

## 0.1.6 (2026-06-04)

This was a version bump only for core to align it with other projects, there were no code changes.

## 0.1.5 (2026-05-31)

This was a version bump only for core to align it with other projects, there were no code changes.

## 0.1.4 (2026-05-31)

This was a version bump only for core to align it with other projects, there were no code changes.

## 0.1.3 (2026-05-30)

This was a version bump only for core to align it with other projects, there were no code changes.

## 0.1.2 (2026-05-30)

### 🩹 Fixes

- **core:** restore timestamptz/bool entity column types for PostgreSQL compatibility ([3a602bc](https://github.com/Rytass/WMS-Module/commit/3a602bc))

### ❤️ Thank You

- Chia Yu Pai @fantasywind

## 0.1.1 (2026-05-30)

### 🩹 Fixes

- **core:** use cross-database column types instead of postgres-specific ones ([928fad0](https://github.com/Rytass/WMS-Module/commit/928fad0))

### ❤️ Thank You

- Chia Yu Pai @fantasywind
- Claude Sonnet 4.6

## 0.1.0 (2026-05-30)

### 🚀 Features

- **libs:** add package exports and typesVersions for npm publishing ([fd53a37](https://github.com/Rytass/WMS-Module/commit/fd53a37))
- **core:** make libs/core publishable as @rytass/wms-module-core ([37abd0e](https://github.com/Rytass/WMS-Module/commit/37abd0e))
- **api:** whole-loader transfer (Phase 2d-sync) ([c5eab6f](https://github.com/Rytass/WMS-Module/commit/c5eab6f))
- **api:** change logs missing added ([6d81c16](https://github.com/Rytass/WMS-Module/commit/6d81c16))
- **api:** add loaderTypeKey and locationKey in loaders query ([fe7891e](https://github.com/Rytass/WMS-Module/commit/fe7891e))
- **api:** add wildcard search key in ship/receive/transfer findmany ([60a2e56](https://github.com/Rytass/WMS-Module/commit/60a2e56))
- **api:** default root location ([925e2e9](https://github.com/Rytass/WMS-Module/commit/925e2e9))
- **api:** resolve default location as well ([9efa7d7](https://github.com/Rytass/WMS-Module/commit/9efa7d7))
- **api:** prepared stage fixed ([c9bae45](https://github.com/Rytass/WMS-Module/commit/c9bae45))
- **api:** add root args in location ([eaedf55](https://github.com/Rytass/WMS-Module/commit/eaedf55))
- **api:** add location children ([c79f51c](https://github.com/Rytass/WMS-Module/commit/c79f51c))
- **api:** use repo to create location directly ([c48f371](https://github.com/Rytass/WMS-Module/commit/c48f371))
- **api:** add parent to location dto ([daefc90](https://github.com/Rytass/WMS-Module/commit/daefc90))
- **api:** add update location ([feede98](https://github.com/Rytass/WMS-Module/commit/feede98))
- **api:** add location isActive ([883898f](https://github.com/Rytass/WMS-Module/commit/883898f))
- **api:** make cancel quantity optional, cancel the reset remaining items when order removed ([aa5e1aa](https://github.com/Rytass/WMS-Module/commit/aa5e1aa))
- **api:** add cancel transfer and cancel shipment mutations ([8acca85](https://github.com/Rytass/WMS-Module/commit/8acca85))
- **api:** add status flow check in split Batch ([b50ae14](https://github.com/Rytass/WMS-Module/commit/b50ae14))
- **api:** add saleId and saleserialId in ship inv order resolver ([2e40377](https://github.com/Rytass/WMS-Module/commit/2e40377))
- **api:** transferOrder query ([3fa51ea](https://github.com/Rytass/WMS-Module/commit/3fa51ea))
- **api:** handle find other status in service ([bc72904](https://github.com/Rytass/WMS-Module/commit/bc72904))
- **api:** add reclassify changeType ([26fddca](https://github.com/Rytass/WMS-Module/commit/26fddca))
- **api:** add receive inventory order insepction result ([670eb2f](https://github.com/Rytass/WMS-Module/commit/670eb2f))
- **api:** stock validation ([7253822](https://github.com/Rytass/WMS-Module/commit/7253822))
- **api:** add quantity check ([f961fe0](https://github.com/Rytass/WMS-Module/commit/f961fe0))
- **api:** default loader ([a0a8255](https://github.com/Rytass/WMS-Module/commit/a0a8255))
- **api:** inspection service ([e1e2b75](https://github.com/Rytass/WMS-Module/commit/e1e2b75))
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
- **api:** add refactored ids query ([a65ca93](https://github.com/Rytass/WMS-Module/commit/a65ca93))
- **api:** merge/split order service ([8aa313c](https://github.com/Rytass/WMS-Module/commit/8aa313c))
- **api:** add batch reuse case when split ([6f11f89](https://github.com/Rytass/WMS-Module/commit/6f11f89))
- **api:** loader unit query ([1ab3b21](https://github.com/Rytass/WMS-Module/commit/1ab3b21))
- **api:** sale order query ([208e904](https://github.com/Rytass/WMS-Module/commit/208e904))
- **api:** ship inv order mutation ([06921c8](https://github.com/Rytass/WMS-Module/commit/06921c8))
- **api:** reference shippedQuantity, material batch added ([3210f0f](https://github.com/Rytass/WMS-Module/commit/3210f0f))
- **api:** batch group; ([a278012](https://github.com/Rytass/WMS-Module/commit/a278012))
- **api:** use key for ship inventory order create/update ([8075051](https://github.com/Rytass/WMS-Module/commit/8075051))
- **api:** allocated order query ([1cd9e08](https://github.com/Rytass/WMS-Module/commit/1cd9e08))
- **api:** origin status of stock handling ([e2a3d0b](https://github.com/Rytass/WMS-Module/commit/e2a3d0b))
- **api:** add base service ([76c731d](https://github.com/Rytass/WMS-Module/commit/76c731d))
- **api:** add relation for change type ([1c4f944](https://github.com/Rytass/WMS-Module/commit/1c4f944))
- **api:** change log id ([1a39fba](https://github.com/Rytass/WMS-Module/commit/1a39fba))
- **api:** wildcard query ([ed937d6](https://github.com/Rytass/WMS-Module/commit/ed937d6))
- **api:** wildcard query ([abe6d23](https://github.com/Rytass/WMS-Module/commit/abe6d23))
- **api:** conversionFactor added ([98fbe76](https://github.com/Rytass/WMS-Module/commit/98fbe76))
- **api:** aggregate key query field ([51ec50d](https://github.com/Rytass/WMS-Module/commit/51ec50d))
- **api:** conversion added ([904855b](https://github.com/Rytass/WMS-Module/commit/904855b))
- **api:** allocate inventory order ([347a377](https://github.com/Rytass/WMS-Module/commit/347a377))
- **api:** hold ([1e681e4](https://github.com/Rytass/WMS-Module/commit/1e681e4))
- **api:** transfer ([190c56b](https://github.com/Rytass/WMS-Module/commit/190c56b))
- **api:** transfer order ([180dcf8](https://github.com/Rytass/WMS-Module/commit/180dcf8))
- **api:** transfer order service ([9fe36c1](https://github.com/Rytass/WMS-Module/commit/9fe36c1))
- **api:** key interface ([3c2051e](https://github.com/Rytass/WMS-Module/commit/3c2051e))
- **api:** loader type with key ([00d7c18](https://github.com/Rytass/WMS-Module/commit/00d7c18))
- **api:** aggregated stock ([d3da278](https://github.com/Rytass/WMS-Module/commit/d3da278))
- **api:** add order service of different execution ([02a0ea6](https://github.com/Rytass/WMS-Module/commit/02a0ea6))
- **api:** each order type entities group ([3a51551](https://github.com/Rytass/WMS-Module/commit/3a51551))
- **api:** unit query ([78a1cc3](https://github.com/Rytass/WMS-Module/commit/78a1cc3))
- **api:** transfer order ([b87e062](https://github.com/Rytass/WMS-Module/commit/b87e062))
- **api:** add serialId in loader dto ([f6de96b](https://github.com/Rytass/WMS-Module/commit/f6de96b))
- **api:** loader types compound key like search ([ea1588b](https://github.com/Rytass/WMS-Module/commit/ea1588b))
- **api:** loader types query ([6eaa38b](https://github.com/Rytass/WMS-Module/commit/6eaa38b))
- **api:** add create location ([21d7dae](https://github.com/Rytass/WMS-Module/commit/21d7dae))
- **api:** material unit resolvefield ([f753dac](https://github.com/Rytass/WMS-Module/commit/f753dac))
- **api:** remove actual quantity field ([a7b0e40](https://github.com/Rytass/WMS-Module/commit/a7b0e40))
- **api:** add status trigger ([a5a16e5](https://github.com/Rytass/WMS-Module/commit/a5a16e5))
- **api:** ship and receive function in service ([a65f3d2](https://github.com/Rytass/WMS-Module/commit/a65f3d2))
- **api:** location map setup ([a393696](https://github.com/Rytass/WMS-Module/commit/a393696))
- **api:** module setup ([42c1475](https://github.com/Rytass/WMS-Module/commit/42c1475))
- graphql ([d54cf50](https://github.com/Rytass/WMS-Module/commit/d54cf50))
- **loader:** graphql; ([6374006](https://github.com/Rytass/WMS-Module/commit/6374006))
- **stock:** service, entities ([b1d6dec](https://github.com/Rytass/WMS-Module/commit/b1d6dec))
- **receive-inventory-order:** entities and service ([30cab71](https://github.com/Rytass/WMS-Module/commit/30cab71))
- **ship-inventory-order:** entities and service ([0d0727c](https://github.com/Rytass/WMS-Module/commit/0d0727c))
- **material:** entities and service ([ebbcf09](https://github.com/Rytass/WMS-Module/commit/ebbcf09))
- **api:** add graphql lib ([99e0717](https://github.com/Rytass/WMS-Module/commit/99e0717))
- **api:** loaders ([c63a2f3](https://github.com/Rytass/WMS-Module/commit/c63a2f3))

### 🩹 Fixes

- **release:** prevent staging deploy from breaking on lib publish setup ([1095a25](https://github.com/Rytass/WMS-Module/commit/1095a25))
- **api:** seed mapdata id ([2ac4c17](https://github.com/Rytass/WMS-Module/commit/2ac4c17))
- **api:** ship mutation and ship status ([105a66e](https://github.com/Rytass/WMS-Module/commit/105a66e))
- **api:** inspectionResult and batchKey given case fixed ([dc0c7fa](https://github.com/Rytass/WMS-Module/commit/dc0c7fa))
- **api:** material agg query fixed ([3accc39](https://github.com/Rytass/WMS-Module/commit/3accc39))
- **api:** fix deallocate ([789e8c7](https://github.com/Rytass/WMS-Module/commit/789e8c7))
- **api:** update bug fixed ([b8f5d3e](https://github.com/Rytass/WMS-Module/commit/b8f5d3e))
- **api:** general update issue ([309f44e](https://github.com/Rytass/WMS-Module/commit/309f44e))
- **api:** fix aggregated ([589d592](https://github.com/Rytass/WMS-Module/commit/589d592))
- **api:** aggregate key issue ([db44277](https://github.com/Rytass/WMS-Module/commit/db44277))
- **api:** fix ship order update removedAt ([f6d9748](https://github.com/Rytass/WMS-Module/commit/f6d9748))
- **api:** create batch in ship reference if not existed ([4c46813](https://github.com/Rytass/WMS-Module/commit/4c46813))
- **api:** fix sale order query args type ([0b99855](https://github.com/Rytass/WMS-Module/commit/0b99855))
- **api:** fix receive/ship update ([386175a](https://github.com/Rytass/WMS-Module/commit/386175a))
- **api:** fixing receive/ship removed status ([9b07c10](https://github.com/Rytass/WMS-Module/commit/9b07c10))
- **api:** missing select in receive/ship order ([4900389](https://github.com/Rytass/WMS-Module/commit/4900389))
- **api:** material unit find issue fixed ([4e6d3f0](https://github.com/Rytass/WMS-Module/commit/4e6d3f0))
- **api:** material aggregation fixed ([b7dd984](https://github.com/Rytass/WMS-Module/commit/b7dd984))
- **api:** transfer aggregate logic ([3bbffa8](https://github.com/Rytass/WMS-Module/commit/3bbffa8))
- **api:** pagination ([9859e76](https://github.com/Rytass/WMS-Module/commit/9859e76))
- **api:** aggregated pagination ([c5435cb](https://github.com/Rytass/WMS-Module/commit/c5435cb))
- **api:** relations ([5d6a61f](https://github.com/Rytass/WMS-Module/commit/5d6a61f))
- **api:** orders query status expressoion fixed ([febe1ff](https://github.com/Rytass/WMS-Module/commit/febe1ff))
- **api:** type fixed ([dd8858f](https://github.com/Rytass/WMS-Module/commit/dd8858f))
- **api:** typing fixed ([4d31b85](https://github.com/Rytass/WMS-Module/commit/4d31b85))
- **ship-inventory-order:** set item removedAt in item update payload ([139f945](https://github.com/Rytass/WMS-Module/commit/139f945))

### ❤️ Thank You

- Chia Yu Pai @fantasywind
- Claude Opus 4.7 (1M context)
- Claude Sonnet 4.6
- MarshallChiang