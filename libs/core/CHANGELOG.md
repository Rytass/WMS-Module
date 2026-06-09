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