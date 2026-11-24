# WMS-Module 測試規劃（core 為主）

基準量測：分支 `fix/core-ledger-invariants` @ `dda4fdec`（非 main），2026-11-23，本機 Postgres 127.0.0.1:5432。所有 file:line 以 `dda4fdec` 為準；量測後同分支已前進到 `8b9aa691` 且 `ship-inventory-order.service.ts` 有未提交修改，ship 的行號可能位移。

## 0. 結論摘要

- **「core 單元測試 100%」是錯的目標。** 抽樣的 service 方法中純計算約佔 5–50%（`StockService.findChangeLogs` 5%、`receive()` 12%、`ship()` 30%、`consumption.getProgress` 50%），其餘是鎖、交易、SQL 聚合（`SUM`/`HAVING`/狀態 `CASE`/`WITH RECURSIVE`）。mock 掉 `EntityManager` 只能驗證「呼叫了某個 QueryBuilder 方法」，驗不到 SQL 語意、NULL 三值邏輯、advisory lock、caller manager 是否被沿用——而這些正是 CLAUDE.md 記載的歷史事故來源。
- 代表方法拆解（行數粗估，行號以 `dda4fdec` 為準）：

  | 方法                                          | 範圍                                            | 純計算       | 只有真 Postgres 能證明的部分                                                       |
  | --------------------------------------------- | ----------------------------------------------- | ------------ | ---------------------------------------------------------------------------------- |
  | `StockService.validateStockAvailability`      | `stock.service.ts:880-923`                      | 約 30%       | `pg_advisory_xact_lock` 後再 `SUM`；autocommit 下鎖已失效                          |
  | `StockService.findChangeLogs`                 | `stock.service.ts:1094-1317`                    | 約 5%        | 11 個 leftJoin、changeType `CASE`、`quantityChanged * stock.quantity > 0` 符號過濾 |
  | `ShipInventoryOrderService.ship`              | `ship-inventory-order.service.ts:925-1049`      | 約 30%       | `lockStockSlots` 鎖序（#195）、in-shipment 批次鎖、caller manager                  |
  | `TransferOrderService.transfer`               | `transfer-order.service.ts:744-1002`            | 約 30%       | `findAggregatedStocks` 的 loader 總量、`splitBatch` find-or-create、#186 逐行處理  |
  | `ReceiveInventoryOrderService.receive`        | `receive-inventory-order.service.ts:503-707`    | 約 12%       | `COALESCE(SUM)` 的 onHand 決定是否 split（#184）                                   |
  | `ConsumptionOrderService.getProgress` / `act` | `consumption-order.service.ts:279-331, 350-517` | 約 50% / 25% | order 列 `pessimistic_write`、同次呼叫累計                                         |

- **兩個實測事實讓 mock 失去理由**：584 個真 Postgres 測試全套 10.7 秒；僅靠整合測試，core 已有 82.9% line coverage。
- **替代目標（分層門檻）**：
  - 純函式層（抽出後的 `libs/core/src/lib/utils/**` 等）：**單元測試 100% line + 100% branch**，這是「接近 100%」可以誠實兌現的地方。
  - core 整體：**單元＋整合合併**計，line ≥ 92%、branch（扣除裝飾器假分支）≥ 85%（現況 82.9% / 約 70%）。
  - core services：合併計 line ≥ 90%、branch ≥ 80%（現況 78.9% / 約 67%）。
  - 另以「不變式矩陣」（第 3 節）作為完成判準：覆蓋率只證明「有執行」，矩陣證明「有斷言」。
- **最大缺口不在計算，在沒人測的 service**：transfer-customer／transfer-vendor branch 3%、merge-batch 0%、quality-inspection 0%、`BaseOrderService.add/deduct`（給 host 用的公開 API）從未執行。
- **數量算術抽取應在 #227 內做**（同時換 decimal），不要先抽一次再改一次；#227 issue 內的兩個重現（3×0.1 對 0.3、whole-loader 加總順序依賴）直接當失敗測試。
- 規劃過程發現 4 個疑似缺陷（第 3.4 節），建議先寫失敗測試確認再開 issue。

## 1. 現況基準（實測）

| 項目                                  | 數字                                    |
| ------------------------------------- | --------------------------------------- |
| graphql 全套（`--maxWorkers=2`）      | 26 suites / 584 tests 全過，wall 10.7 s |
| 同上加 coverage（core+graphql 插樁）  | wall 25.8 s                             |
| core lines                            | 82.9%（2655/3203）                      |
| core branches（raw）                  | 64.8%（1387/2140）                      |
| core branches（扣裝飾器假分支，近似） | 約 70%（1078/1544）                     |
| core/services lines                   | 78.9%（1951/2473）                      |
| core/services branches（近似校正）    | 約 67%（865/1293）                      |
| graphql lines / branches（近似校正）  | 86.4% / 約 42%（126/300）               |
| core 單元 spec 數                     | 0                                       |
| CI 測試 workflow                      | 無（只有 `staging.yml` 部署）           |

量測註記：

- **core 預設不會被計入 coverage**：`libs/graphql/jest.config.mjs` 的 rootDir 是 `libs/graphql`，`collectCoverageFrom: '../core/**'` 無效。量測改用暫存 config 把 rootDir 提到 `libs/` 並改寫 `<rootDir>`。正式設定須避開此陷阱（第 5 節）。
- **branch 假分支**：`@swc/jest` 的 `decoratorMetadata: true` 對每個建構子參數／entity 屬性產生 `typeof X === "undefined" ? Object : X` 三元式，只走一側。`core/models` line 100% 但 branch 50.5%，校正後 2/2；services 有約 350 個此類假分支。本次校正規則為「`cond-expr` 且起始行原始碼無 `?` 者排除」，屬近似：換行的真三元式會被誤排除，含 `?.`／`??` 或 `foo?: T` 的裝飾行會留下假分支（graphql 校正後 42% 可能因此偏低）。「校正後」數字應讀作約略值；正式 gate 用第 5.2 節較精確的規則。
- 執行結束有 `A worker process has failed to exit gracefully`（teardown 洩漏），以及一次預期內的 `Unable to connect to the database. Retrying`。
- specs 用固定 DB 名（`wms_module_*_test`，目前本機殘留 18 個）且不清除；本次量測未新增任何 DB。

各 service（校正後 branch，由低到高）：

| service                  | lines | branches      |
| ------------------------ | ----- | ------------- |
| merge-batch-order        | 42.6% | 0/8 (0%)      |
| quality-inspection-order | 54.1% | 0/6 (0%)      |
| transfer-customer-order  | 28.6% | 1/38 (3%)     |
| transfer-vendor-order    | 28.6% | 1/38 (3%)     |
| hold-inventory-order     | 73.1% | 29/52 (56%)   |
| material                 | 66.7% | 22/35 (63%)   |
| loader                   | 67.5% | 38/60 (63%)   |
| transfer-order           | 80.3% | 109/171 (64%) |
| batch                    | 76.0% | 48/73 (66%)   |
| receive-inventory-order  | 83.8% | 64/97 (66%)   |
| ship-inventory-order     | 91.3% | 94/142 (66%)  |
| allocate-inventory-order | 88.2% | 36/54 (67%)   |
| inventory-count-order    | 84.3% | 109/143 (76%) |
| consumption-order        | 90.4% | 72/91 (79%)   |
| stock                    | 89.4% | 128/150 (85%) |
| sequence                 | 93.0% | 29/33 (88%)   |

從未執行的公開方法（coverage function hit = 0）：

- `BaseOrderService.add` :51、`deduct` :90（exported，host 自建 order family 用）
- `BatchService.findMany` :373
- `HoldInventoryOrderService.updateHoldInventoryOrder` :182
- `InventoryCountOrderService.update` :736、`removeItem` :957
- `LoaderService.createBatchLoaders` :131、`updateLoader` :178、`updateLoaderType` :206
- `LocationService.updateLocation` :55、`MaterialService.updateMaterial` :121
- `StockService.findAggregatedStock` :806
- `TransferOrderService.updateTransferOrder` :536
- `TransferCustomerOrderService` / `TransferVendorOrderService`：`processXxxItems` :90、`updateXxx` :204（create 只走到 #221 的驗證失敗路徑）

## 2. 純函式抽取清單

路徑皆在 `libs/core/src/lib/` 下。「現況」：A＝已是純函式可直接測；B＝純但私有，export 即可；C＝夾在 service 內需抽出。「整合」＝目前整合測試是否已執行到該邏輯。

### 2.1 零重構／export 一行即可（第 1 期）

| #   | 項目                                                     | 位置                                                | 現況    | 整合     | 備註                                                           |
| --- | -------------------------------------------------------- | --------------------------------------------------- | ------- | -------- | -------------------------------------------------------------- |
| U1  | `assertPositiveQuantity(IfPresent)`                      | `utils/assert-positive-quantity.ts:14-44`           | A       | HSL #221 | branch 75%，缺 NaN/Infinity/字串                               |
| U2  | `runInTransaction` 三路徑                                | `utils/run-in-transaction.ts`                       | A       | 全面     | 假 manager 即可                                                |
| U3  | `tablePathOf` / `quotedTablePathOf`                      | `utils/table-path.ts:20-25`                         | A       | 全面     | schema 拆分、雙引號跳脫                                        |
| U4  | `resolveListSort`                                        | `utils/list-sort.ts:77-113`                         | A       | LS       | 已有 `graphql/list-sort.spec.ts`，搬到 core                    |
| U5  | `wmsLogicalTableName` / `getWmsTablePrefix`              | `table-prefix/logical-table-name.ts:20-37`          | A       | TP       | 測試間重設全域 Symbol state                                    |
| U6  | `runInDispatchScope` / `collectToScope`                  | `events/dispatch-scope.ts:30-46`                    | A       | WOR      | 巢狀只最外層 flush                                             |
| U7  | `WmsEventDispatcher.isActive` / `flush` 錯誤隔離         | `events/wms-event.dispatcher.ts:28-83`              | A       | WOR      | branch 68.8%                                                   |
| U8  | `defaultResolveId`                                       | `events/wms-operation-runner.ts:16-31`              | B       | WOR      |                                                                |
| U9  | `validateStateTransition`（批次三層狀態規則）            | `services/batch.service.ts:47-131`                  | B       | 部分     | 約 14 分支，CP 值最高                                          |
| U10 | `assertCustomChangeTables`                               | `core.module.ts:243-273`                            | B       | CCT      | 4 分支                                                         |
| U11 | `TABLE_TO_CHANGE_TYPE` / `CHANGE_TYPE_TO_EVENT` 窮舉一致 | `events/stock-change.subscriber.ts:67-137`          | B       | 部分     | `Object.values(ChangeType)` 每值皆有事件                       |
| U12 | `collectLocationIds(item)`                               | `events/inventory-count-lock.subscriber.ts:134-147` | C（小） | IC       | 從 `resolveItem` 拆出                                          |
| U13 | `positionKey`                                            | `services/inventory-count-order.service.ts:368-380` | B       | IC       | 改模組函式                                                     |
| U14 | 聚合鍵 `generatedAggregateKey` / `destructAggregateKey`  | `services/stock.service.ts:132-144`                 | B       | 全面     | 須與 SQL `\|\|'\|'\|\|` 版逐字一致（:681-692），加一條整合對照 |

### 2.2 數量算術（第 2 期，併入 #227 / ship-cancel-kind 之後）

建議放 `utils/quantity.ts`（decimal 型別與換算）與 `utils/order-quantity.ts`（依 change 列加總）。#227 把型別換成 decimal.js 時，下列簽章的 `number` 一併換成 `Decimal`。

| #   | 建議簽章                                                                       | 取代的散落點                                                                                                               | 整合     | 重疊                                                                                                                                          |
| --- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1  | `toBaseQuantity(qty, factor)` / `fromBaseQuantity(base, factor)`               | 32 處 `getConversionFactor` 呼叫後的 `qty * factor`，例 `base-order.service.ts:76,114`、`ship:283,294,317`、`hold:104-138` | 全面     | #227                                                                                                                                          |
| Q2  | `sumShipChanges(changes)`                                                      | `ship:564-575, 692-704, 981-985`                                                                                           | HSL      | **ship-cancel-kind 進行中已做**（worktree `WMS-Module-wt-ship-cancel/libs/core/src/lib/utils/ship-change-quantities.ts`，未提交、無單元測試） |
| Q3  | `transferPendingBase(target, factor, changes)`                                 | `transfer:67-82`（私有 const）、`:819-825`、`:884-890`（三種寫法）                                                         | HSL      | **同 worktree 進行中**（`utils/transfer-change-quantities.ts`）；#227                                                                         |
| Q4  | `receiveRemaining(target, factor, changes)`                                    | `receive:577-583`                                                                                                          | PI/HSL   | #227、#223                                                                                                                                    |
| Q5  | `assertWithinRemaining(remaining, requestedBase, ctx)`                         | `ship:709,989`、`transfer:296,894`、`receive:585`、`consumption:491`（6 處、訊息各異）                                     | 部分     | #227                                                                                                                                          |
| Q6  | `computeConsumptionProgress(item, changes, factor)`                            | `consumption:303-325`                                                                                                      | CO       | #227                                                                                                                                          |
| Q7  | `resolveConsumptionAmount({kind, progress, requested?, factor, alreadyMoved})` | `consumption:463-499`（約 7 分支）                                                                                         | CO       | #227                                                                                                                                          |
| Q8  | `consumptionMovement(kind, src, dst)` / `consumptionSign(kind)`                | `consumption:533-545, 561-565`                                                                                             | CO       | —                                                                                                                                             |
| Q9  | `sumQuantities(rows)` / `wholeLoaderCovered(requested, loaderTotal)`           | `transfer:470-492, 861-869`（浮點 `!==`，即 #227 重現 2）                                                                  | HSL #222 | #227                                                                                                                                          |
| Q10 | `checkWholeLoaderCancel` / `checkWholeLoaderCommit` / `isWholeLoader(item)`    | `transfer:255-275, 804-840`；`loaderId === targetLoaderId` 四處 :261,811,843,931                                           | HSL #222 | #225 moveLoader                                                                                                                               |
| Q11 | `computeVariance(counted, factor, book)`                                       | `inventory-count:1070-1076`；SQL 版 :645-651                                                                               | IC       | #227、#226                                                                                                                                    |
| Q12 | `findSnapshotDrift(items, live)`                                               | `inventory-count:1109-1135`                                                                                                | IC       | #226                                                                                                                                          |

### 2.3 規則與流程決策（第 2–3 期，隨相關 issue 抽）

| #   | 建議簽章                                                                             | 位置                                                                                                                         | 重疊                                                                                  |
| --- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| R1  | `decideReceiveBatchAction({inspectionResult, requireInspection, onHand})` → 4 種動作 | `receive:622-681`                                                                                                            | #223                                                                                  |
| R2  | `diffLines(dbIds, incoming)` → `{created, updated, unknownIds}`                      | `ship:445-452, 484-497`；transfer/consumption 同型                                                                           | **#224**（未知 id 改拋錯，正好在此回傳 `unknownIds`）；`75b9b8ae` 的 `removedAt` 規則 |
| R3  | `diffSheet(existing, positions)`                                                     | `inventory-count:425-480`                                                                                                    | #226                                                                                  |
| R4  | `buildStockPair({from, to, baseQty, ...})`                                           | 14 處兩列 stock 配對：`hold:119-141`、`allocate:131-153`、`customer/vendor:140-163`、`split-batch:158-169`、`merge:197-208`… | 可降低 customer/vendor 約 390 行重複                                                  |
| R5  | `assertMergeableBatches(batches, requestedIds)`                                      | `merge-batch-order:71-98`                                                                                                    | 見 3.4 疑似缺陷                                                                       |
| R6  | `nextBatchKey(baseKey, taken, now)`                                                  | `batch.service.ts:324-339`                                                                                                   | 注入時間                                                                              |
| R7  | `formatOrderKey(date, serial)` / `formatLoaderSerial(prefix, n, digits)`             | `helper.service.ts:19-24`、`loader.service.ts:115-123, 166-168`                                                              | 注入時間                                                                              |
| R8  | `statusPredicate(status, negate)` → SQL 片段                                         | `stock.service.ts:483-548`                                                                                                   | 單元只驗字串對照；語意靠整合                                                          |

不抽、只做整合的：`selectQueryBuilder` 狀態 `CASE`（`stock:163-170`）、`findAggregatedStocks` GROUP BY/HAVING、`findChangeLogs` 的 changeType `CASE`（`stock:1208-1237`）、`expandLocationScope` 的 `WITH RECURSIVE`、`readPositions`、scanCode 優先序（`stock:395-438`）、所有鎖與 `splitBatch` find-or-create。

## 3. 整合測試矩陣與缺口

### 3.1 不變式矩陣

縮寫：HSL=host-service-layer、SQJ=schema-qualified-join、CO=consumption-order、IC=inventory-count、PI=pending-inspection、OR=order-references-and-batch-genealogy、WOR=wms-operation-runner、TP=table-prefix、CE=custom-entities、CME=custom-material-entity、RLP=raw-list-pagination、LS=list-sorting。`·`＝無斷言（可能有執行），`n/a`＝不適用，`*`＝僅部分（IC 欄 1 只測 create 半途失敗、欄 10 只測狀態守衛）。

欄：1 回滾無殘留＋caller manager（依 HSL:494-905 B2 參數化 suite 的 `cases` 清單填；Stock 本身無寫入方法）；2 鎖序／併發；3 數量守恆；4 狀態推導；5 事件 post-commit；6 table prefix；7 自訂 entity；8 分頁；9 盤點鎖；10 輸入驗證。

| service          | 1    | 2   | 3      | 4   | 5   | 6   | 7   | 8   | 9   | 10   |
| ---------------- | ---- | --- | ------ | --- | --- | --- | --- | --- | --- | ---- |
| Stock            | n/a  | HSL | HSL,IC | PI  | WOR | TP  | CE  | RLP | IC  | HSL  |
| Batch            | ·    | HSL | OR     | PI  | ·   | ·   | CE  | ·   | ·   | ·    |
| Loader           | HSL  | HSL | ·      | ·   | ·   | TP  | CE  | LS  | ·   | ·    |
| Receive          | HSL  | ·   | PI     | PI  | ·   | TP  | CE  | RLP | ·   | HSL  |
| Ship             | HSL  | HSL | HSL    | ·   | ·   | SQJ | CME | RLP | ·   | HSL  |
| Transfer         | HSL  | HSL | HSL    | HSL | ·   | TP  | ·   | LS  | IC  | HSL  |
| TransferCustomer | ·    | ·   | ·      | ·   | ·   | ·   | ·   | ·   | ·   | HSL  |
| TransferVendor   | ·    | ·   | ·      | ·   | ·   | ·   | ·   | ·   | ·   | HSL  |
| Hold             | HSL  | ·   | ·      | ·   | ·   | ·   | ·   | ·   | ·   | HSL  |
| Allocate         | HSL  | ·   | ·      | ·   | ·   | ·   | ·   | ·   | ·   | HSL  |
| Consumption      | HSL  | CO  | CO     | CO  | CO  | TP  | ·   | CO  | ·   | CO   |
| InventoryCount   | IC\* | ·   | IC     | IC  | ·   | TP  | ·   | IC  | IC  | IC\* |
| SplitBatch       | ·    | HSL | OR     | OR  | WOR | ·   | ·   | ·   | ·   | HSL  |
| MergeBatch       | ·    | ·   | ·      | ·   | ·   | ·   | ·   | ·   | ·   | HSL  |
| Reclassify       | ·    | ·   | CME    | ·   | ·   | ·   | CME | ·   | ·   | HSL  |
| Scrape           | HSL  | ·   | ·      | ·   | ·   | ·   | ·   | ·   | ·   | HSL  |
| QualityInspect   | ·    | ·   | ·      | PI  | ·   | ·   | ·   | ·   | ·   | HSL  |
| Sequence         | HSL  | HSL | n/a    | n/a | n/a | TP  | n/a | n/a | n/a | HSL  |
| OrderReference   | OR   | ·   | n/a    | n/a | WOR | ·   | CE  | OR  | ·   | ·    |

判讀：

- 欄 1：B2 suite 涵蓋 Allocate、Transfer、Receive、Ship、Consumption、Hold、Scrape、`LoaderService.createLoader`；未涵蓋 SplitBatch、MergeBatch、Reclassify、QualityInspection、TransferCustomer/Vendor、InventoryCount 的 start/count/settle、單獨呼叫的 `BatchService.splitBatch`。補洞只需在 `cases` 陣列加一筆。
- 欄 4：`StockStatus.HELD`、`IN_SHIPMENT` 在所有 spec 中出現 0 次；只有 `FREE`、`IN_TRANSFER`、`PENDING_INSPECTION` 有斷言。Hold/Allocate/Ship 的狀態推導無斷言。
- 欄 5：`stock.*` 事件的 post-commit／rollback 不發只在 HSL:917-957 與 WOR 測過；13 個 order family 的事件分類無逐一斷言。
- 欄 6：TP 只涵蓋部分路徑；`WMS_TEST_TABLE_PREFIX=wms_` 全套重跑才是完整覆蓋，目前無人例行執行。
- 欄 10：#224（不存在 id）尚無任何測試。
- GraphQL 層從未出現的 mutation 17 個（`mergeBatch`、`updateTransferOrder`、`settleInventoryCount`、`countInventory`… 等），resolver 參數映射無保護。

### 3.2 共用 fixture（建議做）

實測重複：21 個 integration spec 各自一份建 DB（`Client('postgres')` drop+create）、21 份相同的 `TypeOrmModule.forRoot({...synchronize:true})`、23 處相同的 `WmsModuleGraphqlModule.forRootAsync({...DEFAULT...})`、16 份 `GraphQLModule.forRootAsync`；beforeAll 平均約 79 行；`execute` helper 10 份、`seedStock` 4 份、`seedBatch` 2 份；material/location/batch 內聯 seed 12–14 檔。

放置：`libs/graphql/src/lib/testing/`（不進 `files`，不發布）。

```ts
createTestDatabase(label: string): Promise<{ name: string; options: DataSourceOptions; drop(): Promise<void> }>;
// name = `wms_t_${label}_${process.pid}_${JEST_WORKER_ID}`，afterAll 內 drop；解決多 session 撞名與殘留

createWmsTestApp(opts: {
  label: string;
  wms?: Partial<WmsModuleGraphqlModuleAsyncOptions>;
  graphql?: boolean;
  extraImports?: ModuleMetadata['imports'];
}): Promise<WmsTestApp>; // { app, dataSource, entities, get, execute, close }

seed(ctx: WmsTestApp): {
  material(p?: Partial<MaterialEntityClass>): Promise<MaterialEntityClass>;
  location(p?: Partial<LocationEntityClass>): Promise<LocationEntityClass>;
  batch(p: { materialId: string } & Partial<BatchEntityClass>): Promise<BatchEntityClass>;
  stockIn(p: { materialId: string; batchKey: string; locationId?: string; loaderId?: string; quantity: string }): Promise<string>; // 走 receive，不直接寫 stocks
};
```

遷移策略：新 spec 一律用 fixture；舊 spec 在被修改時順手遷移，不做一次性大搬家。

### 3.3 帳本守恆 helper（建議做）

目前只有零散的 `SUM(quantity)` 比對（HSL:1473、HSL:2376、IC:138/156、CO:137/283、TP:433），沒有通用對帳。

```ts
ledgerSnapshot(m: EntityManager, entities: WmsEntities): Promise<LedgerSnapshot>;
// 依 (material, batch, location, loader) 的 SUM(stocks.quantity)，numeric 以字串/Decimal 保存

expectLedgerInvariants(before: LedgerSnapshot, after: LedgerSnapshot, expect: {
  external?: string; // 本次操作預期的全倉總量變化（receive/ship/scrape/settle/count）
}): void;
// 1. 每個 slot SUM ≥ 0
// 2. 全倉總量（跨物料）變化 = external 宣告值；內部移動淨額 0
// 3. 逐 family 對帳 change 與 stocks 列（見下）
```

第 3 點依 family 分兩類（同一 base order 下）：

- 外部移動（receive、ship、scrape、consumption settle、count settle）：Σ stocks.quantity = change.quantityChanged。
- 配對移動（hold、allocate、transfer、split、merge、reclassify、customer/vendor、ship reserve）：兩列 −base／+base，Σ stocks = 0，且正向那列 = |change.quantityChanged|。
- reclassify 會改物料（`reclassify-inventory-order.service.ts:163-185` 從原物料扣、新物料加），所以第 2 點以全倉總量計，不以單一物料計。

實作前須逐 family 確認 stock 列都掛在同一個 base order（`orderId`）上。

### 3.4 規劃過程發現的疑似缺陷（未驗證，建議先寫失敗測試再判定）

1. **ship 狀態 SQL 單位不一致**：`ship-inventory-order.service.ts:133` 的 `targetsum` 是行自身單位的 `SUM(targetShippedQuantity)`，:152 的 `shippedsum` 是 base unit，:120 直接比較；factor ≠ 1 時 SHIPPED/PARTIAL 判斷錯。ship-cancel-kind 會改這段 SQL，需確認是否一併修。
2. **changeType 兩套分類漂移**：`findChangeLogs` 的 SQL `CASE`（`stock.service.ts:1208-1237`）沒有 inventory count、consumption、custom change tables；`StockChangeSubscriber` 有。需一條整合測試斷言「每張 change table 的 changeLog 類型 = 事件類型」。
3. **merge-batch 身分欄位不完整**：`merge-batch-order.service.ts:79-86` 的 `metadataKeys` 缺 `attributes`、`requiresInspection`（CLAUDE.md 定義兩者屬批次身分）；items 有重複 batchId 時會誤報 "Some source batches were not found"。
4. **字串與數字比較**：`transfer-order.service.ts:820, 888` 的 `c.quantityChanged < 0`（numeric 回傳 string），靠隱式轉型；#227 時一併收斂。

## 4. 性質測試（fast-check，建議採用）

新增 devDependency `fast-check`。固定 seed 進 CI，失敗時印出 seed 與縮減後反例。

| #   | 性質                                                                                                                                                                          | 層   | 規模                                                                                                                              |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------- |
| P1  | 加總與順序無關：任意 decimal 數量陣列（含 0.1/0.2/0.3 類），`sumQuantities(perm(xs)) == sumQuantities(xs)`；`wholeLoaderCovered` 對 items 任意排列結果相同                    | 單元 | numRuns 1000，毫秒級                                                                                                              |
| P2  | 換算往返與累加：`fromBase(toBase(q,f),f) == q`；n 次部分出貨/收貨，每次 ≤ remaining，則 Σ = target 時 remaining == 0 且下一筆被拒（#227 重現 1 的一般化）                     | 單元 | numRuns 1000                                                                                                                      |
| P3  | 狀態機模型：consumption 任意 issue/return/settle 序列（模型＝純函式 Q6/Q7），`outstanding = issued − returned − settled ≥ 0`、`issued ≤ target`，拒絕的動作不改變 progress    | 單元 | numRuns 500                                                                                                                       |
| P4  | 帳本守恆：隨機命令序列（receive/hold/release/allocate/ship/cancelShip/transfer/cancelTransfer），每步後 `expectLedgerInvariants`，且 service 回報的 progress 與純函式模型一致 | 整合 | numRuns 25–50，每 run 在外層 `dataSource.transaction` 中執行並 rollback（利用「所有寫入方法接受 caller manager」），預估 +10–20 s |

P4 是唯一能抓「單一操作都對、組合後錯」的手段（#186、#195 都屬此類）。依賴 3.3 的 helper 與 3.2 的 `stockIn`。

## 5. 基礎建設

### 5.1 jest 專案

```
jest.config.mjs                  (new)  projects: [core, graphql, react]
  libs/core/jest.config.mjs      (new)  unit, *.spec.ts, no DB
  libs/graphql/jest.config.mjs   (keep) integration
  libs/react/jest.config.mjs     (keep)
```

- core 新增 `test` target：`jest -c libs/core/jest.config.mjs`，沿用 graphql 的 swc options（`keepClassNames`、legacyDecorator）。
- 整合測試**留在 graphql**：多數 spec 需要 GraphQL module；搬到獨立 project 只換位置不換能力。以檔名區分：`*.integration.spec.ts` vs `*.spec.ts`，graphql 增 `test:unit`（排除 integration）方便無 DB 環境。
- **合併 coverage 只能從 root 跑**：root config 的 rootDir 是 repo 根，`collectCoverageFrom: ['libs/core/src/**/*.ts', 'libs/graphql/src/**/*.ts', '!**/*.spec.ts', '!**/index.ts', '!**/testing/**']`。在各 lib 內跑會漏算 core（本次實測踩到）。
- worker 上限：root 與各 project 的 script 一律帶 `--maxWorkers=2`；本機包 `bash ~/.claude/locks/heavy.sh`。
- table prefix 第二輪：`WMS_TEST_TABLE_PREFIX=wms_` 全套再跑一次（+約 11 s），列為 CI 必跑。

### 5.2 coverage gate

jest 內建 `coverageThreshold` 無法排除裝飾器假分支，改用 `tools/coverage-gate.mjs` 讀 `coverage-final.json`：

- 排除規則：`cond-expr` 且其 span（`locations[].start..end`）對應的原始碼不含 `?`。裝飾器 metadata 三元式的 span 落在型別標註（如 `DataSource`）上，必不含 `?`；真三元式即使換行也含 `?`。本次用的「起始行」近似版已顯示 models 218 → 2 個真分支；正式版在第 1 期以 3–4 個檔案人工抽驗。
- 門檻（逐期提高，見第 7 節），依 glob 分組：

| glob                                | lines | branches |
| ----------------------------------- | ----- | -------- |
| `libs/core/src/lib/utils/**`        | 100   | 100      |
| 第 2 節抽出的純函式所在檔           | 100   | 100      |
| `libs/core/src/lib/services/**`     | 90    | 80       |
| `libs/core/src/**`（整體）          | 92    | 85       |
| `libs/graphql/src/lib/resolvers/**` | 85    | 不設     |

- graphql branch 不設門檻：校正後只剩 300 個分支，多為參數預設值，追它是為測而測。

### 5.3 CI

- 現況：無任何 PR 觸發的測試（`.github/workflows/` 只有 `staging.yml`，self-hosted runner）。
- 建議新增 `.github/workflows/test.yml`（on: pull_request）：install → lint → typecheck → root jest `--coverage` → 第二輪 prefix → `coverage-gate`。總時間估計 3–5 分鐘（測試本體 < 1 分鐘）。
- Postgres 來源需決策（第 8 節問題 1）。

### 5.4 前置修正

- teardown 洩漏（`worker failed to exit gracefully`）：gate 前先修，否則 CI 偶發卡住。
- DB 命名與清除：由 3.2 fixture 統一，順便清掉本機 18 個殘留 `wms_module_*_test`（需使用者同意，第 8 節問題 4）。

## 6. react

不設全域門檻。現況：`csv.spec.ts`、`mapDataToNodes.spec.ts` 兩支，`testEnvironment: node`，無 RTL。

值得單元測（純函式，table-driven）：

- `components/inventoryActions/utils.ts`：`inventoryActionsEnableStatus` :148、`inventoryActionsSpec` :223（UI 動作 gating，與後端狀態規則同語意，最該測）、`getQuantityWithUnitId` :30、`formatAvailableInventoryList` :427。
- `components/inventoryActions/ShipInventoryMatcher/utils.ts:6` `matchInventoryToReference`。
- `hooks/useFullyFilledLoadersByInventoryList.ts`：先把計算抽成純函式再測（整箱判斷，與 core Q9/Q10 同概念）。
- `hooks/useTableSort.ts`、`useTablePagination.ts`：抽出 state 轉移（sort 變更回第 1 頁）。
- `utils/share.ts` 的 `*Name` 映射：對 enum 窮舉，防止新增 enum 值漏翻譯。
- `INVENTORY_ACTION_OPERATIONS` 已由 graphql `operation-names.invariant.spec.ts` 守。

元件層：不追覆蓋率。若要測，只對 inventory-count 上傳比對與 ship/receive Form 的 `fragmentToDefaultValues` 做純函式測試；互動驗證以 Storybook/實機為主。門檻：上列檔案 lines ≥ 90%。

## 7. 分期

```
Phase 1 infra+zero-refactor --> Phase 2 quantity (in #227) --> Phase 4 property
        |  |
        +--> Phase 3 integration gaps -+  (#223/#224/#225/#226 ride along)
```

**第 1 期：基礎建設＋零重構單元（小）**

- 範圍：5.1 jest 專案、5.2 gate 腳本、5.4 teardown 修正、3.2 fixture 骨架（`createTestDatabase`/`createWmsTestApp`）、2.1 U1–U14 單元測試。
- 先後：可與 `fix/core-ledger-invariants` 合併後立即開始；不碰 service 邏輯，與進行中分支無衝突（U9/U11 僅加 `export`）。
- 完成判準：`nx test core` 可跑；root 合併報表產出；U1–U14 所在檔單元 100% line/branch；gate 以現況（core lines 83 / branch 70）為下限上線，防退步。

**第 2 期：數量算術抽取（中，併入 #227）**

- 範圍：Q1–Q12；#227 issue 的兩個重現先寫成失敗測試；P1–P3 性質測試；Q5 統一錯誤訊息。
- 先後：在 `fix/ship-cancel-kind` 合併後（Q2 已在該分支，避免衝突）；#195(c) transfer kind 若另開分支，Q3 隨它做。
- 完成判準：`utils/quantity.ts`、`utils/order-quantity.ts`、consumption/whole-loader/variance 純函式 100% branch；ship/transfer/receive/consumption/inventory-count 內不再有 `Number(...quantityChanged)` 手寫加總（grep 為 0）；P1–P3 進 CI。

**第 3 期：整合缺口（中～大）**

- 範圍：
  - 0% 區：transfer-customer/vendor 完整流程（含 R4 `buildStockPair` 後兩檔共用）、merge-batch（含 3.4 第 3 點）、quality-inspection、`BaseOrderService.add/deduct`（host 路徑）。
  - 從未執行的 update/remove 方法（第 1 節清單）。
  - 矩陣欄 4：HELD/IN_SHIPMENT/ALLOCATED 狀態斷言；欄 1：HSL 參數化回滾 suite 擴到所有寫入方法；欄 5：每個 order family 一條 `stock.*` 事件分類斷言＋3.4 第 2 點 changeLog 對照。
  - 3.3 帳本 helper，回填到既有 HSL/CO/IC 斷言。
  - 3.4 疑似缺陷逐一寫失敗測試、判定、開 issue。
  - R1/R2/R3 隨 #223/#224/#226 抽；#225 moveLoader 新方法直接帶回滾＋鎖序＋守恆測試。
- 完成判準：core/services 合併 lines ≥ 90%、校正 branch ≥ 80%；17 個未測 mutation 至少各一條 GraphQL 層測試；矩陣依欄判定：
  - 欄 1、3、4、5、10：每個有寫入方法的 service 都要有斷言。
  - 欄 2：只要求多行寫入方法（呼叫 `lockStockSlots` 者）。
  - 欄 6、7：以 `WMS_TEST_TABLE_PREFIX=wms_` 全套重跑與 CE 六個 entity 一次覆蓋，不逐格要求。
  - 欄 8：只要求有 `findMany`／列表的 service；欄 9：只要求會移動庫存的 service。

**第 4 期：性質測試＋react（中）**

- 範圍：P4 整合性質測試；第 6 節 react 純函式；門檻升到最終值（core 整體 92/85）。
- 完成判準：P4 在 CI 以固定 seed 跑 ≥ 25 runs；react 指定檔 lines ≥ 90%；CI 全套（含 prefix 第二輪）< 5 分鐘。

## 8. 決策紀錄（2026-11-24）

| 題目                     | 決定                                                      |
| ------------------------ | --------------------------------------------------------- |
| CI 的 Postgres           | workflow 起 Postgres service container                    |
| 覆蓋率門檻               | 分層：純函式 100%；core 合併 92／85；core/services 90／80 |
| 數量算術抽取時機         | 併入 #227                                                 |
| 殘留 `wms_module_*_test` | fixture 上線且既有 spec 全部遷移後一起清                  |
| §3.4 疑似缺陷            | 先由獨立代理寫測試驗證，成立者再開 issue 或併入對應 PR    |

原待決策問題保留於下，僅供追溯。

## 9. 需要使用者決策的問題

1. **CI 的 Postgres 從哪來？**
   背景：目前沒有任何 PR 會跑測試，整合測試需要 Postgres。runner 是 self-hosted。
   - A. workflow 用 `services: postgres` 容器：與本機無關、每次乾淨；需 runner 有 Docker（staging 已用 buildx，應有）。
   - B. runner 主機常駐 Postgres：快，但多 job 並行要靠 3.2 的唯一 DB 命名，且主機狀態會漂移。
   - C. 暫不上 CI，只本機跑：零成本，但門檻無人執行，等於沒有門檻。
   - 建議 A。

2. **門檻數字是否接受「純函式 100%／core 合併 92-85／services 90-80」，而非「core 單元 100%」？**
   背景：第 0 節的判斷。若堅持單元 100%，必須 mock QueryBuilder 與 EntityManager，測試量大增且對 SQL、鎖、交易錯誤沒有保護力；合併計的 92/85 對應實際可抓到的錯誤。
   - A. 採用分層門檻（建議）。
   - B. 另外要求 core「僅單元」也設一個低門檻（如 40%）作為純函式抽取進度指標。
   - C. 維持單元 100%。

3. **數量算術抽取的時機：併入 #227，還是先抽再做 #227？**
   - A. 併入 #227（建議）：只改一次；但 #227 的 PR 會變大（約 12 個純函式＋30 處呼叫點）。
   - B. 先做純抽取（行為不變）再做 #227：PR 小、好 review，但 30 處呼叫點要改兩次，且第一次抽出的 `number` 簽章隨即作廢。

4. **本機 18 個殘留測試 DB（`wms_module_*_test`）是否清除？**
   背景：specs 每次啟動會 drop+recreate 同名 DB，所以留著不影響正確性，只佔空間；3.2 fixture 上線後會改用唯一名稱並自動清除，舊名將永久殘留。清除不可還原，但內容全是測試資料。
   - A. fixture 上線時一併清除（建議）。
   - B. 保留。

5. **3.4 的 4 個疑似缺陷如何處理？**
   - A. 第 3 期逐一寫失敗測試確認後開 issue（建議）。
   - B. 現在就開 issue 先記錄，標「待確認」。
