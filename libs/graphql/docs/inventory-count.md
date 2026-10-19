# 盤點（Inventory Count）API 使用說明

> 對象：串接 `@rytass/wms-module-graphql` 的前後端開發者。本文逐一說明盤點的
> 3 支 query 與 9 支 mutation 的用途、參數、前置狀態、錯誤與範例；鎖定與事件的設計理由
> 請另見 [`README.md`「Inventory counting」](../README.md#inventory-counting) 與
> [`events.md`](./events.md)。

## 1. 概觀

盤點是「拿帳面對照現場、再把帳面修正成現場」的流程。三個前提決定了所有 API 的行為：

- **盤點不搬貨。** 只在原位調整數量，位置錯了是調撥（`createTransferOrder`）的事。
- **執行盤差之前都不動庫存。** 盤點數量只是暫存的對帳資料；唯一會寫庫存的是
  `settleInventoryCount`，而且在單一 transaction 內完成。
- **開始盤點即鎖定範圍。** `startInventoryCount` 快照帳面並鎖住範圍內（含所有下層）
  儲位；期間任何碰到這些儲位的庫存異動（含調撥**進入**該儲位）都會被 `409 Conflict`
  擋下，直到結算或取消。

### 1.1 狀態機

```
createInventoryCountOrder ──▶ PENDING（尚未執行）
        │ updateInventoryCountOrder（僅此狀態可改 Info）
        ▼ startInventoryCount
   COUNTING（盤點中）── countInventory / addInventoryCountItem /
        │              removeInventoryCountItem / resetInventoryCount
        ├── settleInventoryCount ──▶ COMPLETED（已完成）
        └── cancelInventoryCount ──▶ CANCELLED（已取消）  ◀── 也可從 PENDING 取消
```

`COMPLETED` 與 `CANCELLED` 是終態，任何 mutation 都會回 `400`。

### 1.2 每支 mutation 都是一個 transaction

建立／更新／開始／暫存／新增列／移除列／清空／取消／結算各自整體成功或整體回滾，
不會留下半張單。宿主直接呼叫 `InventoryCountOrderService` 時，每個方法最後一個參數
都可傳入自己的 `EntityManager` 以併入既有 transaction（見 §6）。

### 1.3 權限名稱與部署開關

每支操作都掛 `@WmsOperation`，名稱即 `authChecker` 收到的字串，也是
`forRootAsync({ enabledOperations / disabledOperations })` 可開關的單位：

| 操作 | 名稱 |
| --- | --- |
| `inventoryCountOrders`、`inventoryCountOrder` | `inventory-count-order:read` |
| `inventoryCountOrderItems` | `inventory-count-order:read-items` |
| `createInventoryCountOrder` | `inventory-count-order:create` |
| `updateInventoryCountOrder` | `inventory-count-order:update` |
| `startInventoryCount` | `inventory-count-order:start` |
| `countInventory` | `inventory-count-order:count` |
| `addInventoryCountItem` | `inventory-count-order:add-item` |
| `removeInventoryCountItem` | `inventory-count-order:remove-item` |
| `resetInventoryCount` | `inventory-count-order:reset` |
| `cancelInventoryCount` | `inventory-count-order:cancel` |
| `settleInventoryCount` | `inventory-count-order:settle` |

## 2. 型別

### `InventoryCountOrderDto`（盤點單）

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `id` | `ID!` | |
| `key` | `String!` | 盤點單號（系統流水號） |
| `name` | `String!` | 名稱 |
| `countDate` | `String!` | 盤點日期 `YYYY-MM-DD`，是**基準日**：盤差對外以此日期呈現，`createdAt` 保留真實建立時間 |
| `status` | `InventoryCountStatus!` | `PENDING` 尚未執行／`COUNTING` 盤點中／`COMPLETED` 已完成／`CANCELLED` 已取消 |
| `createdBy` | `String` | 建立者；由 `createInventoryCountOrder` 的 `createdBy` 寫入 |
| `startedAt` `settledAt` `cancelledAt` | `DateTime` | 對應狀態轉換的時間 |
| `createdAt` | `DateTime!` | |
| `locations` | `[LocationDto!]!` | 使用者**選的根儲位**；下層展開不在此欄（但會被鎖定） |
| `items` | `[InventoryCountOrderItemDto!]!` | **整張**盤點清單，不分頁。表格請改用 `inventoryCountOrderItems`；只有需要全量（匯出、上傳比對）時才選這個欄位 |

### `InventoryCountOrderItemDto`（盤點清單的一列）

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `id` `orderId` `materialId` `batchId` | `ID!` | |
| `locationId` `loaderId` | `ID` | 位置；`loaderId` 為 null 代表預設載具 |
| `unitId` | `ID` | 盤點數量使用的單位，是 **`MaterialUnitDto.id`**；null 代表基本單位 |
| `bookQuantity` | `Float!` | 帳面數量，**基本單位**，開始盤點時凍結 |
| `countedQuantity` | `Float` | 盤點數量，以 `unitId` 的單位計；null 代表尚未盤 |
| `isAddition` | `Boolean!` | `true` 為盤點中手動新增的盤盈列（`bookQuantity` 必為 0，且是唯一可刪的列） |
| `held` `inShipment` `inspectionResult` `requiresInspection` `transferId` | 旗標 | 開始盤點當下從 batch **快照**而來：凍結／出貨中／檢驗結果／是否需檢驗／調撥中。開始前為 null |
| `vendorId` `customerId` `saleId` `saleSerialId` | `String` | 同上，供應商／客戶／銷售訂單號碼／項次的快照 |
| `material` `batch` `location` `loader` | 關聯 | DataLoader 解析；`material.materialUnits` 可用來組單位下拉與換算 |

> 為什麼快照而不是即時解析：batch 在盤點結束後仍會變動，若即時解析，已完成的盤點單
> 會在幾個月後自己改寫。盤點中儲位已鎖，快照與即時值必然相同。

### 分頁型別

`InventoryCountOrders` 與 `InventoryCountOrderItems` 都是 `{ id, items, total }`。

## 3. Query

### 3.1 `inventoryCountOrders` — 盤點列表

```graphql
query {
  inventoryCountOrders(
    offset: 0
    limit: 10
    name: "例行盤點"                # ILIKE 模糊比對
    statuses: [PENDING, COUNTING]
    createdBy: "Mark Wu"            # 完全比對
    countDateFrom: "2025-01-01"     # 含
    countDateTo: "2025-12-31"       # 含
    locationIds: ["<locationId>"]   # 比對「展開後」的範圍：篩某層架會找到盤整條走道的單
  ) {
    total
    items { id key name countDate status createdBy locations { id key } }
  }
}
```

- 排序固定 `countDate DESC, createdAt DESC`。
- 全部參數可省略；`offset < 0` 或 `limit <= 0` 視為不分頁。

### 3.2 `inventoryCountOrder` — 單張盤點單

```graphql
query {
  inventoryCountOrder(id: "<orderId>") {
    id key name countDate status createdBy startedAt settledAt cancelledAt
    locations { id key }
    # items { ... }   ← 只有匯出／上傳比對需要整張清單時才選
  }
}
```

- 查無此單回 `404 NotFoundException`。

### 3.3 `inventoryCountOrderItems` — 盤點清單（分頁＋篩選）

```graphql
query {
  inventoryCountOrderItems(
    id: "<orderId>"
    offset: 0
    limit: 20
    materialKey: "WATER"           # 以下五個為 ILIKE 模糊比對
    materialDescription: "礦泉水"
    batchKey: "2510"
    locationKey: "1000A1B"
    loaderSerialId: "BY00"
    vendorId: "V001"               # 以下四個為完全比對（比對列上的快照值）
    customerId: "C001"
    saleId: "SO240596827"
    saleSerialId: "00100043"
    onlyVariance: true             # 只回「已暫存的盤點量 ≠ 帳面」的列
  ) {
    total
    items {
      id bookQuantity countedQuantity unitId isAddition
      held inShipment inspectionResult requiresInspection transferId
      vendorId customerId saleId saleSerialId
      material { id key description baseUnit { id key } materialUnits { id unit conversionFactor } }
      batch { id key }
      location { id key }
      loader { id serialId }
    }
  }
}
```

- 排序：新增的盤盈列優先，其後依料號、批號、id，分頁不會重複或漏列。
- `onlyVariance` 的比較會先把 `countedQuantity` 以 `unitId` 的換算係數換成基本單位，
  與結算用的是同一套換算；**只看已暫存（`countInventory`）的值**，前端尚未送出的輸入
  不在其中，切換前請先暫存。
- 需要整張清單（例如下載盤點清單）時，請用 `inventoryCountOrder.items`，不要用大
  `limit` 翻頁拼湊。

## 4. Mutation

共通規則：

- 單據不存在 → `404`；狀態不符 → `400`，訊息指出目前狀態與要求的狀態。
- 每支都在一個 transaction 內；失敗即整體回滾。
- 每支都會發出對應的操作事件（§5），`beforeHooks` 丟出例外即可否決。

### 4.1 `createInventoryCountOrder` — 建立盤點

```graphql
mutation {
  createInventoryCountOrder(
    name: "2025-上半年度例行盤點"
    countDate: "2025-12-25"
    locationIds: ["<rootLocationId>", "..."]   # 必填、至少一個；下層全部自動納入
    createdBy: "Mark Wu"                        # 選填；列表「建立者」與其篩選即讀此欄
  ) { id key status }
}
```

- 事件：`inventory-count-order.created`。
- 建立時就把範圍展開落地，並依目前帳面產生第一版清單（`PENDING` 狀態下可重算）。
- `locationIds` 為空 → `400`。

### 4.2 `updateInventoryCountOrder` — 修改 Info（僅尚未執行）

```graphql
mutation {
  updateInventoryCountOrder(
    id: "<orderId>"
    name: "新名稱"            # 以下三個皆選填
    countDate: "2025-12-26"
    locationIds: ["<rootLocationId>"]
  ) { id name countDate locations { key } }
}
```

- 事件：`inventory-count-order.updated`。
- 僅 `PENDING`；開始盤點後 Info 唯讀。
- 傳了 `locationIds` 會重新展開範圍並**重建清單**（帳面列會依新範圍增減，盤盈列不動）；
  傳空陣列 → `400`。

### 4.3 `startInventoryCount` — 開始盤點

```graphql
mutation { startInventoryCount(id: "<orderId>") { id status startedAt } }
```

- 事件：`inventory-count-order.started`。
- `PENDING → COUNTING`。做兩件事，且在同一個 transaction 內：
  1. **快照**：重算每列 `bookQuantity`，並把 batch 的九個旗標寫到列上；
  2. **鎖定**：範圍內（含下層）儲位自此拒絕所有庫存異動，直到結算或取消。
- 建議前端先跳確認框（「系統將鎖定盤點範圍的庫存禁止異動行為…」），因為鎖定會影響
  其他正在作業的人。

### 4.4 `countInventory` — 暫存結果

```graphql
mutation {
  countInventory(
    id: "<orderId>"
    items: [
      { itemId: "<itemId>", countedQuantity: 94 }                        # 基本單位
      { itemId: "<itemId>", countedQuantity: 8, unitId: "<materialUnitId>" }  # 指定單位
      { itemId: "<itemId>", countedQuantity: null }                      # 清空，回到「尚未盤」
    ]
  ) { id }
}
```

- 事件：`inventory-count-order.counted`。
- 僅 `COUNTING`。**不動庫存**，只把數量與單位存到列上，可分多次、多人呼叫。
- `countedQuantity`：省略或 `null` 清空；負數或非數字 → `400`。
- `unitId`：省略＝維持原單位；`null`＝基本單位；給值＝該料號的 `MaterialUnitDto.id`。
- `itemId` 不屬於此單 → `404`。空陣列為 no-op。

### 4.5 `addInventoryCountItem` — 新增庫存（盤盈列）

```graphql
mutation {
  addInventoryCountItem(
    id: "<orderId>"
    materialId: "<materialId>"
    batchKey: "2510310042"        # 既有批號或新批號；不存在會立即建立
    locationId: "<locationId>"    # 必須在盤點範圍內
    loaderId: "<loaderId>"        # 選填；null 代表預設載具
    countedQuantity: 100          # 必須 > 0
    unitId: "<materialUnitId>"    # 選填；null 代表基本單位
  ) { id isAddition bookQuantity countedQuantity batch { key } }
}
```

- 事件：`inventory-count-order.updated`（回傳的是**該列** `InventoryCountOrderItemDto`）。
- 僅 `COUNTING`。新列 `bookQuantity = 0`、`isAddition = true`，旗標從它的 batch 快照
  （全新批號即預設值：未凍結、未調撥、未檢驗）。
- 錯誤（皆 `400`）：`countedQuantity <= 0`；`locationId` 不在範圍內；該 position
  （料號＋批號＋儲位＋載具，載具以解析後的值比對）已經在清單上——請直接在那一列填數量，
  否則結算會對同一批庫存調整兩次。

### 4.6 `removeInventoryCountItem` — 刪除盤盈列

```graphql
mutation { removeInventoryCountItem(id: "<orderId>", itemId: "<itemId>") { id } }
```

- 事件：`inventory-count-order.updated`。
- 僅 `COUNTING`，且只能刪 `isAddition = true` 的列；帳面列一律鎖定 → `400`。

### 4.7 `resetInventoryCount` — 清空重填

```graphql
mutation { resetInventoryCount(id: "<orderId>") { id status } }
```

- 事件：`inventory-count-order.reset`。
- 僅 `COUNTING`。清空所有列的 `countedQuantity` 與 `unitId`，並刪除所有盤盈列；
  **狀態維持 `COUNTING`、鎖定不解除、帳面快照不重取**（儲位鎖著，帳面本來就沒變）。
- 會丟掉現場已填資料，前端應加確認框。

### 4.8 `cancelInventoryCount` — 取消盤點

```graphql
mutation { cancelInventoryCount(id: "<orderId>") { id status cancelledAt } }
```

- 事件：`inventory-count-order.cancelled`。
- `PENDING` 或 `COUNTING → CANCELLED`，**解除鎖定**；暫存的數量留在列上供查閱，但不會
  寫入庫存。

### 4.9 `settleInventoryCount` — 執行盤差

```graphql
mutation { settleInventoryCount(id: "<orderId>") { id status settledAt } }
```

- 事件：`inventory-count-order.settled`；每一列有差異者另發 `stock.count-gained`
  （盤盈）或 `stock.count-lost`（盤虧）。
- 僅 `COUNTING → COMPLETED`，單一 transaction，順序如下：
  1. **重驗快照**：每一帳面列的 `bookQuantity` 必須仍等於當下帳面。不等代表有東西繞過
     鎖寫了庫存（例如直接寫 `stocks`），此時回 `409 Conflict`、不寫任何東西；請取消後重盤。
  2. 逐列計算 `delta = countedQuantity × 換算係數 − bookQuantity`：
     - `countedQuantity` 為 null（沒盤）→ **跳過，不當作 0**；
     - `delta = 0` → 不寫；
     - 否則寫一列 `inventory_count_order_changes` 與一列 `stocks`（`+` 盤盈／`−` 盤虧），
       位置為該列的儲位與載具（null 載具解析為預設載具）。
  3. 更新狀態與 `settledAt`，鎖定隨之解除。
- 前端送出前請先 `countInventory` 把畫面上的輸入全部暫存，結算只看已存的值；結算期間
  建議鎖住整頁（不可離開／取消）。

## 5. 事件

| 事件 | 觸發 | `result` 型別 |
| --- | --- | --- |
| `inventory-count-order.created` | create | `InventoryCountOrderDto` |
| `inventory-count-order.updated` | update／add-item／remove-item | `InventoryCountOrderDto` 或 `InventoryCountOrderItemDto`（add-item） |
| `inventory-count-order.started` | start | `InventoryCountOrderDto` |
| `inventory-count-order.counted` | count | `InventoryCountOrderDto` |
| `inventory-count-order.reset` | reset | `InventoryCountOrderDto` |
| `inventory-count-order.cancelled` | cancel | `InventoryCountOrderDto` |
| `inventory-count-order.settled` | settle | `InventoryCountOrderDto`；另有 `stock.count-gained` / `stock.count-lost` |

事件在最外層 transaction commit **之後**才送出；`beforeHooks` 在任何寫入之前執行，丟出
例外即否決。詳見 [`events.md`](./events.md)。

## 6. 從宿主程式直接呼叫

GraphQL 之外，宿主也可注入 `InventoryCountOrderService`（`@rytass/wms-module-core`）：
方法與 mutation 一一對應，最後一個參數可傳 `EntityManager` 併入既有 transaction。

```ts
await dataSource.transaction(async (manager) => {
  const order = await counts.create(
    { name: '夜間盤點', countDate: '2026-01-31', locationIds: [aisleId], createdBy: 'batch-job' },
    manager,
  );
  await counts.start(order.id, manager);
});

await counts.count(order.id, [{ itemId, countedQuantity: 94 }]);
await counts.settle(order.id); // 自己開 transaction
```

直接呼叫一樣受鎖定保護（鎖在 `*_order_change` 的 insert 上，不在 resolver），事件也一樣
會發出（`WmsOperationRunner`）。

## 7. 被鎖定時會看到什麼

盤點中，對範圍內儲位的任何庫存異動——出貨、調撥（來源**或目的**在範圍內）、報廢、
凍結、拆併批……——都會收到：

```
409 Conflict
Location <locationId> is locked by inventory count order <key>;
finish or cancel that count before moving this stock.
```

訊息指名單號，現場即可找到該單去結算或取消。
