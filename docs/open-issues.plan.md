# Open issues 盤點與落地計畫（2026-11-23）

> **Status: PLANNED。** 撰寫基準 `main` @ `8d91665f`（`core@0.13.0`）。各張的判定是讀程式碼得出的，
> 沒有跑過 repro；每張 issue 開工的第一步，都是把它的 repro 寫成失敗的 direct-service case
> （寫進 `libs/graphql/src/lib/host-service-layer.integration.spec.ts`，#183–#186 也是這樣落地的），
> 用這個 case 驗證本文的判定。
>
> 本檔放在 repo 根目錄的 `docs/`，**不會**發佈到 npm。

## 0. 判定總表

分類：

- **A**：帳本不變式。library 必須守住，無條件修。
- **B**：host 政策。可以做成 opt-in，預設行為不變。
- **C**：需求合理，但該改的不是這個 repo。
- **D**：已在 main 修好，只差關單。
- **E**：前端元件行為。

| Issue | 主題                                              | 分類    | main 現況                                                     | 期別               |
| ----- | ------------------------------------------------- | ------- | ------------------------------------------------------------- | ------------------ |
| #221  | 寫入 API 接受負數量                               | A       | 只有 consumption `act`、盤點 `count`/`addItem` 有 >0 檢查     | P1                 |
| #195  | `ship()` 驗錯批次，滿額備貨無法出貨               | A       | (a)(b)(c) 都還在，見 §2                                       | P1（a,b）／P4（c） |
| #222  | 併板到他處 loader，loader 與庫存分家              | A       | `transfer-order.service.ts:922-930` 無條件更新 loader 位置    | P1                 |
| #223  | 收貨位置 ≠ loader 位置                            | A       | `receive-inventory-order.service.ts:607-619` 兩者不比對       | P2                 |
| #224  | 不存在的 itemId／materialKey 靜默成功             | A       | 各處 `if (!item) return`；建單時 `catch { return acc }`       | P2                 |
| #227  | 數量用 JS float 運算                              | A       | 31 個 `numeric` 欄位宣告成 `number`；加總比較約 25+6 處       | P3                 |
| #225  | 無法搬移有預留庫存的 loader                       | B       | 沒有 move API；whole-loader gate 1 只接受 FREE                | P4                 |
| #226  | 盤點不鎖儲位                                      | B       | `InventoryCountLockSubscriber` 只認 `status='COUNTING'`       | P4                 |
| #230  | `batches.groupId` 無索引                          | A（小） | 欄位在本 repo `batch.entity.ts`，可直接加 `@Index()`          | P5                 |
| #228  | `stocks.createdAt` 無時區                         | C       | 欄位定義在 `@rytass/wms-base-nestjs-module` 的 `stock.entity` | P5（上游）         |
| #229  | core-only host 裝不起來（`@nestjs/graphql` peer） | C       | base module 的 peer 全是 `*`，沒有 `peerDependenciesMeta`     | P5（上游）         |
| #180  | 寬表格 resize 無法往右撐                          | E       | PR #198 只做了 200px 保留區繞過，見 §6                        | P5                 |
| #183  | 未執行的調撥預留無法釋放                          | D       | 已修，`pendingBaseQuantity`；`core@0.10.0` 起                 | 關單               |
| #184  | `requireInspection:false` 仍拆批                  | D       | 已修；`core@0.10.0` 起                                        | 關單               |
| #185  | loader 序號用 CURRVAL                             | D       | 已修，改走 `WmsSequenceService`；`core@0.10.0` 起             | 關單               |
| #186  | 同批兩行調撥第二行無法執行                        | D       | 已修，逐筆處理＋`lockStockSlots`；`core@0.10.0` 起            | 關單               |

所有 issue 都屬於 library 層級應有的範圍。唯一的例外是 #228／#229：需求本身合理，但根因在 base module。

## 1. P1：帳本會被寫錯的問題（core patch）

### 1.1 #221 數量驗證

- 新增 `libs/core/src/lib/utils/assert-positive-quantity.ts`：`Number.isFinite(q) && q > 0`，不符就拋
  `BadRequestException`，訊息帶出欄位名與 itemId。
- **只驗公開入口的參數**：`quantity`、`target*Quantity`、`items[].quantity`。不能放進共用的
  `process*Items`，因為 `release`、`deallocate`、`return*CustomerOrder`、`return*VendorOrder` 內部會刻意寫負的
  target。`removeShipInventoryOrder`／`removeTransferOrder` 呼叫 `cancel*Internal` 前，已經先過濾 `> 0`，
  不受影響。
- `cancelShip`／`cancelTransfer` 收到 `<= 0` 時，目前會靜默回 `true`，改成拋錯。
- 涵蓋的方法：ship、cancelShip、addShipInventoryOrderItems、receive、createReceiveInventoryOrder、
  createTransferOrder、transfer、cancelTransfer、hold／release、allocate／deallocate、split、merge、reclassify、
  scrap、inspection、customer／vendor create 與 return。consumption 與盤點已經有檢查，補上一致的訊息即可。
- 測試：以參數化 case 跑每個入口傳 `-5`、`0`、`NaN`，斷言拋錯，且 `stocks` 列數不變。

### 1.2 #195 (a)(b)：出貨驗證的批次與鎖序

- (a) `ship-inventory-order.service.ts:904` 的 `validateStockAvailability` 改驗 `shippedBatch.id`。
- (b) 只做 (a) 會違反「先鎖 stock 再 split」的規則：`splitBatch` 先拿 batch-group 鎖，驗證時才拿子批的 stock
  鎖，這和其他路徑的取鎖順序相反，可能 40P01（死鎖）。做法：
  1. 在 `lockStockSlots` 之前，先用唯讀方式找出每個 item 的 in-shipment 子批（`splitBatch` 的 sibling lookup，
     抽成不建立、不鎖的 `findSibling`）；
  2. 把原批與子批的 slot 一起交給 `lockStockSlots`（去重、排序）；
  3. 之後才進 `splitBatch`。

  `cancelShipInternal` 的順序也一樣錯，一併修正。

- 測試：issue 留言裡的三個 case（滿額 100、部分 60/40、子批被抽乾後拒絕），加上一個反序死鎖 case，
  比照 host-service-layer 現有的 "opposite order"。

### 1.3 #222 併板時的 loader 位置

- 只有 whole-loader 時才更新 loader 位置，判定為 `item.loaderId === header.loaderId`（`:177/:246/:262` 都是這個定義）。
- 非 whole-loader（把庫存併到 `targetLoaderId`）時：
  - 目標 loader 已有庫存，且 `locationId ≠ targetLocationId` → 拒絕，不寫入任何資料。
  - 目標 loader 是空的：見 §7 問題 3。
- 在 `createTransferOrder` 階段就檢查，避免到執行 `transfer()` 時才失敗、留下預留。

## 2. P2：靜默成功與位置不一致（core，行為變更）

這一期會讓原本「回 true」的呼叫改成拋錯，changelog 要寫成 **behaviour change**。在 0.x 用 `fix(core)` 發 patch，
但 RELEASING 的 changelog 要特別點名。

### 2.1 #224

- `ship`、`receive`、`transfer`、`cancelShipInternal`、`cancelTransferInternal` 的 `if (!item) return` 改成拋
  `NotFoundException(itemId)`。
- `createReceiveInventoryOrder`：`if (!material) return acc` 改成拋錯，並拿掉外層的
  `try { … } catch { return acc }`。這個 catch 也會吞掉 `getBatch` 的真實錯誤。
- `processTransferOrderItems` 遇到缺 `batchId`／`materialId` 的行會 `continue`，一樣改成拋錯。
- 測試：issue 的四個 repro，斷言整筆 rollback（第二行也不會被建立）。

### 2.2 #223

- `receive` 解析出 `loaderId` 之後，讀該 loader 的 `locationId` 與收貨的 `locationId` 比對。建單
  （`processReceiveInventoryOrderItems`）時同樣檢查，並修掉 loaderKey 找不到就變 null 的問題（併入 #224）。
- 空 loader 的處理方式見 §7 問題 3。

## 3. P3：#227 數量改用 decimal

- 先決條件：P1 完成，因為兩期改的是同一批比較式。
- 做法見 §7 問題 4。不論選哪個方向，都要：
  - 給 `numeric` 欄位加上 TypeORM `transformer`，或在型別上明確宣告成 `string`，終止「宣告是 number、runtime 是
    string」的隱式轉型；
  - 把 `!==`／`>` 的數量比較都換成 decimal 比較。包含 `assertSnapshotHolds`（盤點）與 whole-loader 的
    `subTotalQty !== loaderTotalQty`。
- 測試：issue 的兩個 repro（0.1×3，以及 0.1+0.2+0.3 換順序），另在每個 service 各補一個 0.1 粒度的 case。

## 4. P4：需要決策的新能力（core＋graphql＋react，minor）

### 4.1 #225 搬移 loader（含預留庫存）

放寬 transfer 的 gate 不是便宜的選項：transfer 會把每個批次拆成 `transferId` 子批，`inShipment` 旗標不會保留。
`ship()` 又是用 `item.locationId` 加 `splitBatch({ inShipment })` 找庫存，搬完之後出貨會在舊位置找不到貨。
建議改成新增獨立操作，見 §7 問題 1。設計要點：

- `LoaderMoveOrder`：order、item、`loader_move_order_changes`。加進 `OWNED_CHANGE_TABLES`、`TABLE_TO_CHANGE_TYPE`、
  `models.module.ts` 的 entities；
- 每個 (batch, 狀態) 寫一組成對的 stock 列（舊位置 −、新位置 +）。**批次 id 不變**，旗標原樣帶過去；
- 同一交易內，把該 loader 上未完成的 ship／hold／allocate／transfer item 的 `locationId` 改成新位置；
- 盤點鎖：subscriber 已經會讀 `locationId` 與 `targetLocationId`，item 要帶上兩端，兩端都會被檢查；
- GraphQL：`moveLoader` mutation，加上 `WMS_OPERATION_NAMES`、`@WmsOperation`、`@WmsMutationEvent`；
- react：loader 操作抽屜加「搬移」，也可以先只出 API。

### 4.2 #226 不鎖儲位的盤點

- 開關的位置與差異公式見 §7 問題 2。無論選哪種：
  - subscriber 的查詢加上該旗標的條件；
  - `settle` 在不鎖模式下跳過 `assertSnapshotHolds`；
  - `settle` 前先 `lockStockSlots`，避免與同時進行的出貨競爭；
  - 快照與差異保留在 `inventory_count_order_items`，提供 ERP 查詢（GraphQL 已有 `inventoryCountOrderItems`）。
- 預設仍是鎖定。

### 4.3 #195 (c) 取消量被算成已出貨

`cancelShipInternal` 與 `ship()` 都寫負向 change row，已出貨數量與訂單狀態都無法區分兩者。修法比照
`consumption_order_changes`，加 `kind` 欄位（SHIP／CANCEL）。這是 schema 變更，需要附 upgrade SQL；
既有的 cancel 列要靠 `orderId` 對應回 cancel 操作才能回填。建議另開 issue，見 §7 問題 7。

## 5. P5：小項與上游

- **#230**：在 `batch.entity.ts` 的 `groupId` 加 `@Index()`。要確認 `withWmsTablePrefix` 會不會連帶改寫衍生的
  index 名稱（寫一個 prefix 模式的 schema 斷言）。升級 SQL 寫在 `docs/integration-guide.md`：
  `CREATE INDEX CONCURRENTLY … ON <prefix>batches ("groupId")`。
- **#228**：改 base module 的 `stock.entity`（`@CreateDateColumn({ type: 'timestamptz' })`），由 base 發版，core 再
  跟進 peer 範圍。既有資料沒有通用的回填方式：原值是依各部署當時的 session time zone 寫入的，升級 SQL 只能給
  `ALTER … TYPE timestamptz USING "createdAt" AT TIME ZONE '<部署時區>'` 的範本，由部署方填入時區。
- **#229**：在 base module 的 `package.json` 加 `peerDependenciesMeta: { "@nestjs/graphql": { "optional": true } }`。
  已確認 0.4.0 的 JS 不 import graphql，只有 `dto/*.d.ts` 會用到。本 repo 在 README 補上 workaround
  （`@nestjs/graphql@13`、`graphql@16`），等上游發版。
  - PR 對象：npm 的 `repository` 指向 `Rytass/Utils`，但本機 clone 的 remote 是 `cloudsan/Utils`。開 PR 前要確認目標。
- **#180**：見 §6。

## 6. #180 現況（未在瀏覽器實測）

issue 是在 Mezzanine 1.4.3 上量測的；目前專案是 `@mezzanine-ui/react` 1.10.2，PR #198 之後尚未實測。

`TableWrapper/Table` 仍寫死 `fullWidth`／`resizable`，actions 欄永遠存在。PR #198 刻意讓 actions 欄撐到 200px
當作 resize 的借用空間（`RESIZE_RESERVE_WIDTH`），這和 issue 要的「沒有 row actions 就不出空欄」正好相反。

真正的 grow-table 模式要 Mezzanine Table 提供 resize 策略，應該往上游提。本 repo 能做的：

1. 在 1.10.2 上實測，確認 inventory list 能否把前段欄位往右拉寬；
2. 把 `fullWidth`、`scroll` 開放成 wrapper prop；
3. 上游有 grow 模式之後，再把保留區換成 grow 策略，並拿掉空的 actions 欄。

## 7. 待決策

決策回來後回寫本節。

1. **#225 的形狀**。建議新增 `moveLoader` 操作（§4.1），不建議放寬 transfer gate。
2. **#226 的差異公式與旗標位置**。
   - 公式：issue 要的是「實盤 − 快照」，時間差交給 ERP 處理。另一種是「實盤 − 結算當下帳面」。兩者寫進帳本的
     結果不同。「實盤 − 快照」在盤點期間若有出貨，結算後可能把 slot 扣成負數。
   - 旗標位置：放在訂單欄位（每張盤點各自選，需要 migration），或放在模組選項（整個部署統一）。
   - 建議：用訂單欄位，公式選「實盤 − 快照」，但結算若會讓 slot 變負數就拒絕。
3. **#222／#223 遇到空 loader**。下游 Shuttle 的 receive／transfer 都不帶 loader，不受影響。iAmech 的用法未知。
   - 建議：loader 為空時，跟著把 loader 移到目標位置；有庫存但位置不符時拒絕。
4. **#227 的 decimal 做法**。比較在 SQL `numeric` 端做，或引入 decimal 函式庫（例如 `decimal.js`，要同步改
   rollup externals 與 `dependencies`）。建議用函式庫，不自己寫 BigInt 縮放。
5. **#228／#229 的上游 PR**。由我在 base module 開 PR，或由維護者處理。
6. **#183–#186 關單**。附上「fixed in core@0.10.0」的說明後關閉。
7. **#195 (c) 另開 issue**。

## 8. 發版

- P1–P3 只動 core，但 graphql 的 peer `^0.13.x` 在 0.x 不接受 core 的 minor，所以發 patch 就好。
- P4 會動 core、graphql、react，三包一起發 minor。
- 每期一個 PR，合併後跑 `yarn release`，再由維護者在本機執行 `yarn release:publish --otp`。
