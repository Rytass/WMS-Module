## 0.4.1 (2026-09-01)

This was a version bump only for react to align it with other projects, there were no code changes.

## 0.4.0 (2026-09-01)

### ⚠️ Breaking change

The `InventoryCountOrder` fragment no longer selects `items`. The count sheet moved to the
paginated `inventoryCountOrderItems` query, because a field resolver can take neither a page
nor a filter and a count covering an aisle runs to thousands of lines.

If you read `data.inventoryCountOrder.items`, it is gone — use the
`InventoryCountOrderItemsDocument` query instead. This is a minor bump because in `0.x` this
project treats minor as the breaking-change channel (see `RELEASING.md`).

Also in this release: `@mezzanine-ui/icons` and `@rytass/wms-map-react-components` are no
longer marked optional peers. They never were optional — both are static top-level imports
reachable from the package barrel, so omitting them produced a module-not-found at build
time rather than a degraded UI. Install them if you were relying on the flag.

### 🚀 Features

- **react:** filter stock by the four commercial attributes, and tell the two empty states apart ([a527ee0](https://github.com/Rytass/WMS-Module/commit/a527ee0))
- **react:** paginate and filter the inventory count sheet ([0a98944](https://github.com/Rytass/WMS-Module/commit/0a98944))

### 🩹 Fixes

- **react:** give the emitted declarations explicit relative specifiers ([7753552](https://github.com/Rytass/WMS-Module/commit/7753552))
- **deps:** correct two runtime dependency ranges that nothing was validating ([d7ed0c0](https://github.com/Rytass/WMS-Module/commit/d7ed0c0))
- **repo:** make the pre-publish gate able to fail, and stop packing src twice ([f45a681](https://github.com/Rytass/WMS-Module/commit/f45a681))
- **deps:** widen the published peer ranges to match what the code actually uses ([c9bd621](https://github.com/Rytass/WMS-Module/commit/c9bd621))

### ❤️ Thank You

- Chia Yu Pai @fantasywind
- Claude Opus 5

## 0.3.0 (2026-08-31)

### 🚀 Features

- **react:** implement the inventory count pages ([270712b](https://github.com/Rytass/WMS-Module/commit/270712b))
- **react:** let Maps drop its inventory-action toolbar ([d6fa657](https://github.com/Rytass/WMS-Module/commit/d6fa657))
- **react:** let a deployment switch inventory actions off, and report failures ([2c79706](https://github.com/Rytass/WMS-Module/commit/2c79706))

### ❤️ Thank You

- Chia Yu Pai @fantasywind
- Claude Opus 5

## 0.2.3 (2026-08-27)

This was a version bump only for react to align it with other projects, there were no code changes.

## 0.2.2 (2026-08-27)

This was a version bump only for react to align it with other projects, there were no code changes.

## 0.2.1 (2026-08-14)

This was a version bump only for react to align it with other projects, there were no code changes.

## 0.2.0 (2026-06-30)

### 🚀 Features

- **react:** inject navigation via WmsRouterProvider for App Router support ([2b30bcf](https://github.com/Rytass/WMS-Module/commit/2b30bcf))

### ❤️ Thank You

- Chia Yu Pai @fantasywind
- Claude Opus 4.8 (1M context)

## 0.1.7 (2026-06-09)

This was a version bump only for react to align it with other projects, there were no code changes.

## 0.1.6 (2026-06-04)

This was a version bump only for react to align it with other projects, there were no code changes.

## 0.1.5 (2026-05-31)

### 🩹 Fixes

- **react:** give Map container min-height to prevent empty-state collapse ([bf5e41f](https://github.com/Rytass/WMS-Module/commit/bf5e41f))

### ❤️ Thank You

- Chia Yu Pai @fantasywind
- Claude Sonnet 4.6

## 0.1.4 (2026-05-31)

### 🩹 Fixes

- **react:** declare @rytass/wms-map-react-components as optional peer dependency ([1583bc6](https://github.com/Rytass/WMS-Module/commit/1583bc6))

### ❤️ Thank You

- Chia Yu Pai @fantasywind
- Claude Sonnet 4.6

## 0.1.3 (2026-05-30)

This was a version bump only for react to align it with other projects, there were no code changes.

## 0.1.2 (2026-05-30)

This was a version bump only for react to align it with other projects, there were no code changes.

## 0.1.1 (2026-05-30)

This was a version bump only for react to align it with other projects, there were no code changes.

## 0.1.0 (2026-05-30)

### 🚀 Features

- **libs:** add package exports and typesVersions for npm publishing ([fd53a37](https://github.com/Rytass/WMS-Module/commit/fd53a37))
- **frontend:** correct condition of QualityInspection ([1d04395](https://github.com/Rytass/WMS-Module/commit/1d04395))
- **react:** publish UI surface as @rytass/wms-module-react ([bf88d4b](https://github.com/Rytass/WMS-Module/commit/bf88d4b))

### 🩹 Fixes

- Circular dependency ([1a22f72](https://github.com/Rytass/WMS-Module/commit/1a22f72))
- add typing ([05fd569](https://github.com/Rytass/WMS-Module/commit/05fd569))
- **react:** ship ESM-only build with explicit global type augmentations ([082fe53](https://github.com/Rytass/WMS-Module/commit/082fe53))

### ❤️ Thank You

- Chia Yu Pai @fantasywind
- Claude Opus 4.7 (1M context)
- Claude Sonnet 4.6
- TingTing