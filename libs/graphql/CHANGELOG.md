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