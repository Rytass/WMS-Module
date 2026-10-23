# 設計稿 vs 程式碼稽核（design-vs-code audit）

對照對象：Figma `3rBlE6ssq1ppdgCpgl0HkY`「RY2500065_WMS 倉儲管理核心開發」DESIGN 群組共 12 頁、277 個 frame。
frame 清冊見 [`design-inventory.md`](./design-inventory.md)（含每頁 `node-id`，可用 `?node-id=` 直接開啟）。

## 稽核方法與其邊界

本稽核比對的是**畫面／狀態的覆蓋度**：對每一個設計 frame，找出程式中實現該畫面或該狀態的檔案。
frame 名稱能明確指出「有沒有這個狀態」，但**不能**指出該狀態裡每個欄位、每個文案的細節；
因此本報告分成三級，並且每一條缺口都附上程式證據（`檔案:行號`）：

| 記號 | 意義 |
| --- | --- |
| ✅ | 程式中找得到對應實作 |
| ❌ | 程式中找不到，且已用 grep 確認（附證據） |
| 🔍 | 名稱無法判定，需與設計稿逐格視覺比對（不在本次自動稽核可判定範圍） |

---

## 逐頁覆蓋度

### A-1. 庫存清單（76 frames）→ `components/pages/inventory-list`

| 設計行為 | 狀態 | 對應程式 |
| --- | --- | --- |
| 料號模式 / 攤平模式 雙模式 | ✅ | `Table/index.tsx` `Mode.group` / `Mode.list`；`GroupTable.tsx` / `ListTable.tsx` |
| 有選取時切換模式跳確認 popup | ✅ | `Table/index.tsx:104-124`（「切換模式將清除已選內容」） |
| filter-open（進階搜尋） | ✅ | `FilterWrapper`（`haveAdvancedFilters`） |
| 點擊批號展開子列 | ✅ | `GroupTable.tsx:428` `expandable` |
| 執行操作 / 未勾選項目時 | ✅ | `Table/InventoryActionSelector.tsx` |
| 15 種操作 → message → 查看 → drawer | ✅ | `components/InventoryActionDrawers/*`（15 個資料夾） |
| drawer 清空所有項目 + popup | ✅ | `InventoryActionDrawers/hooks.ts:15`（「清空所有選項」） |
| 再次加入清單／加入重複項目時 | ✅ | `inventoryActions/useInventoryActions.ts:40-52` |
| 拆分批號：新增拆批／再加一筆／重置拆分結果 | ✅ | `inventoryActions/fields/SplitBatchField/index.tsx:46,50` |
| 加入待出庫清單_選完出庫單號後 | ✅ | `InventoryActionDrawers/ShipInventory/index.tsx`（`ShipInventoryMatcher`） |
| 快速帶入篩選條件 | ✅ | `ShipInventoryMatcher` 的 `haveFilterButton` + `setCurrentFilter` |
| **三種 empty state**（執行查詢前提示／查詢後沒資料／初始沒資料） | ❌ | 共用 `TableWrapper/Table/index.tsx:64` 把 `emptyProps` 寫死為「查無資料」，且置於 `{...props}` **之後**，呼叫端傳入的 `emptyProps` 會被覆蓋 |
| **子列以供應商／客戶／銷售訂單號碼／項次篩選** | ❌ | `Table/GroupTable.tsx:134` 程式註解自承「之後應該要加上供應商、客戶、銷售訂單編號、銷售訂單項次」；後端 `FindStockArgs` 亦無這四個參數 |
| 各 frame 的欄位順序、文案、間距 | 🔍 | — |

### A-2. 地圖清單（6 frames）→ `components/pages/maps`

| 設計行為 | 狀態 | 對應程式 |
| --- | --- | --- |
| 地圖 + 下方庫存表 | ✅ | `maps/index.tsx`（`MapContent` + `InventoryTable onlyListMode`） |
| 選取廠商 → 選取區塊（層級下鑽） | ✅ | `map/MapContent.tsx` breadcrumb + `onNodeDoubleClick` |
| 點節點 → 確認 → 帶入篩選（A-2.3 快速帶入篩選條件） | ✅ | `MapContent.tsx:59-75` 確認 dialog；`maps/index.tsx:38-48` 帶入 location filter |
| filter-open | ✅ | `FilterWrapper` |
| empty | ❌ | 同 A-1 的 empty state 限制 |

### A-3. 標籤查詢（27 frames）→ `components/pages/label-search`

| 設計行為 | 狀態 | 對應程式 |
| --- | --- | --- |
| 標籤掃碼輸入 | ✅ | `LabelInput/index.tsx:44` |
| 15 種操作區塊 | ✅ | `OperateArea/*`（15 個資料夾，與 A-1 drawer 一一對應） |
| 重置全部 + popup | ✅ | `label-search/hooks.ts:15` |
| 清空所有項目 / 清空未通過項目 | ✅ | `OperateArea/HostSection.tsx:71-101` |
| default-empty / 選取任一操作 | ✅ | `OperateArea/index.tsx` 依 `targetAction` 切換 |
| A-3.0 掃碼解析_popup | 🔍 | 找不到獨立的「解析結果」popup，但 `ChooseStockTable` 提供多筆命中時的選取；需視覺確認是否為同一件事 |

### B. 庫存異動（41 frames）→ `components/pages/inventory-movement`

| 設計行為 | 狀態 | 對應程式 |
| --- | --- | --- |
| 三分頁：調撥單 / 出庫單 / 入庫單 | ✅ | `inventory-movement/index.tsx`（`Transfer` / `Ship` / `Receive`） |
| 調撥單 對點 + popup + success/fail | ✅ | `Transfer/Table/Actions.tsx:86`、`Transfer/Form/FormBody/index.tsx:67,82` |
| 調撥單 編輯頁 + 新增調撥庫存 + 返回上頁 popup | ✅ | `transfer-order/Form/*`、`transfer-order/TableModal/*` |
| 調撥單 退回 + popup | ✅ | `Transfer/Table/Actions.tsx` |
| 出庫單 出庫 / 取消 + popup | ✅ | `Ship/Table/Actions.tsx` |
| 入庫單 入庫 + popup + 拆分 | ✅ | `Receive/Form/FormBody/FieldArrayTable.tsx:44`（拆分） |
| filter-open（三分頁各一） | ✅ | 三個 `index.tsx` 皆用 `FilterWrapper` |

### C. 異動紀錄（3 frames）→ `components/pages/change-history`

| 設計行為 | 狀態 | 對應程式 |
| --- | --- | --- |
| default / filter-open / nav-close | ✅ | `change-history/index.tsx` + `Table/index.tsx` |

### D. 盤點（26 frames）→ `components/pages/inventory-count`

本輪已補齊，見下節「本輪修補」。

| 設計行為 | 狀態 | 對應程式 |
| --- | --- | --- |
| 建立盤點（default / filled / success / fail） | ✅ | `CreateForm/*` |
| 檢視頁 + filter-open | ✅ | `view/index.tsx` + `view/ItemFilters.tsx` |
| 開始盤點 / 取消盤點 / 新增庫存 / 執行盤差（含 loading、success、fail、cancel） | ✅ | `view/index.tsx`、`view/AddStockModal.tsx` |
| 四種狀態（尚未執行 / 盤點中 / 已完成 / 已取消） | ✅ | `Status/index.tsx`、`core` 的 `InventoryCountStatus` |

### E-1. 載具管理（22 frames）→ `components/pages/loaders-management`

| 設計行為 | 狀態 | 對應程式 |
| --- | --- | --- |
| 清單 / 類型 兩分頁 | ✅ | `List/*`、`Types/*` |
| 清單 查看庫存 | ✅ | `List/Table/StockTable.tsx` |
| 清單 編輯 + success/fail/cancel | ✅ | `List/EditForm/*`、`List/Table/Actions.tsx` |
| 新增載具（多筆項目、項目成功／error） | ✅ | `List/Form/AddFields/*`、`List/Form/FieldArrayTable/*` |
| 類型 新增／編輯 + success/fail/cancel | ✅ | `Types/Form/*`、`Types/Table/Actions.tsx` |

### E-2. 庫位管理（13 frames）→ `components/pages/locations-management`

| 設計行為 | 狀態 | 對應程式 |
| --- | --- | --- |
| 地圖 / 列表 兩分頁 | ✅ | `Map/index.tsx`、`List/index.tsx` |
| 列表 新增／編輯 + success/fail/cancel | ✅ | `FormModal/*`、`List/Table/Actions.tsx` |
| 「尚未編輯時」狀態 | 🔍 | `FormModal` 有 dirty 判斷，是否等同設計的反灰態需視覺確認 |

### E-3. 料號管理（15 frames）→ `components/pages/materials-management`

| 設計行為 | 狀態 | 對應程式 |
| --- | --- | --- |
| 列表 + 新增／編輯 popup | ✅ | `Table/*`、`Form/*` |
| 單位（多筆）維護 | ✅ | `Form/UnitsFieldArray.tsx` |
| success / fail / cancel | ✅ | `Table/Actions.tsx`、`Form/index.tsx` |
| **新增_2 次確認**（E-3.1.1 / E-3.2.1） | 🔍 | 程式中查無「2 次確認」字樣；`Form` 只有一段確認。需確認設計是「送出前再確認」還是「離開前確認」（後者已由 `cancelWithConfirm` 覆蓋） |
| **新增_重複**（E-3.1.1.1.3） | 🔍 | 前端無重複料號的專屬提示，後端唯一鍵錯誤會以一般錯誤 toast 呈現 |

### E-4. 出庫單（26 frames）→ `components/pages/ship-inventory-orders`

| 設計行為 | 狀態 | 對應程式 |
| --- | --- | --- |
| 列表 / 建立 / 編輯 / 檢視 | ✅ | `index.tsx`、`CreateForm/*`、`edit/index.tsx`、`view/index.tsx` |
| 刪除 + popup + success/fail | ✅ | `Table/Actions.tsx:65-93` |
| 部分出庫狀態 | ✅ | `Status/index.tsx:19`、`utils/share.ts:133` |
| 編輯 新增項次 / 刪除項次 | ✅ | `Form/FieldArrayTable/index.tsx`、`Form/AddFields/*` |
| 檢視_已出庫 / 已刪除 | ✅ | `view/index.tsx` 依狀態渲染；`FieldArrayTable:212` 有「刪除時間」欄 |
| 建立_2 次確認 | 🔍 | 同 E-3 |

### E-5. 入庫單（25 frames）→ `components/pages/receive-inventory-orders`

結構與 E-4 完全對稱，逐項對應同上（`receive-inventory-orders/*`）；`Status/index.tsx:19` 有「部分入庫」。

---

## 確認的缺口（本輪修補）

### 1. 共用 `Table` 的 `emptyProps` 無法被覆寫

`libs/react/src/components/TableWrapper/Table/index.tsx` 把 `emptyProps` 放在 `{...props}` 之後，
呼叫端傳的 empty 文案一律被「查無資料」蓋掉。A-1 設計要求三種不同的 empty state
（`A-1.4.1 執行查詢前的空白做提示` / `A-1.4.2 查詢後沒資料` / `A-1.4.3 初始沒資料`），
在此限制下無法呈現。

**修法**：`emptyProps` 改為以呼叫端的值為準、缺省才用「查無資料」；庫存清單依「是否套過篩選」
分辨查詢前後兩種空白。

### 2. 庫存缺 供應商／客戶／銷售訂單號碼／銷售訂單項次 篩選

這四個屬性已經在畫面上（`utils/columns.tsx:88-115`）也在資料庫上（掛在 `batches` 表），
但三層都沒有對應的篩選：

- `libs/core` — `FindStockOptions` 無這四個欄位，`stock.service.ts` 的 key 篩選只做到料號／批號／儲位／載具
- `libs/graphql` — `FindStockArgs` 同缺
- `libs/react` — 篩選列沒有這四欄；`GroupTable.tsx:134` 的註解自承子列篩選少了它們

**修法**：三層一起補，`GroupTable` 的子列篩選同步納入這四個條件。

---

## 實測驗證（2026-09-01，本機 API + client）

以暫時的開發用 API（本機 Postgres，資料以 `ReceiveInventoryOrderService` 正常入庫產生：
一個料號、三個批號分別掛 `V-ACME/C-NORTH/SO-1/1`、`V-BETA/C-NORTH/SO-10/1`、
`V-ACME/C-SOUTH/SO-1/2`）搭配 `apps/client` 實際點擊驗證：

| 驗證項目 | 結果 |
| --- | --- |
| 庫存清單 進階搜尋出現 供應商／客戶／銷售訂單號碼／銷售訂單項次 | ✅ |
| 供應商 = `V-BETA` → 展開子列只剩 `B-0002`（另兩筆被濾掉） | ✅ |
| 無篩選且無資料 → 「目前沒有庫存資料」 | ✅ |
| 有篩選（`V-404`）且無資料 → 「查無符合條件的資料」，圖示與文案皆不同 | ✅ |
| 盤點列表頁 篩選列出現 盤點範圍 | ✅ |
| 盤點檢視頁 單身走分頁查詢，篩選列＋進階搜尋、檢驗／凍結／調撥 icon 欄、四個商業欄皆正確 | ✅ |
| 點 `SO-1` 快速帶入篩選 → 剩 2 筆（排除 `SO-10`），且進階搜尋欄同步顯示 `SO-1` | ✅ |
| 尚未執行的盤點：名稱／盤點日期／盤點範圍 可編輯，失焦即存（toast + API 覆核） | ✅ |
| 新增庫存 → 新列置頂並高亮 3 秒 | ⚠️ 未走完 |

最後一項未能在瀏覽器走完：`AddStockModal` 的 載具 欄為必填，而 `AvailableLoadersField`
只列出該儲位上的載具，種子資料的預設載具掛在 `DEFAULT` 儲位而非 `A1-01`，表單送不出去。
這是種子資料的限制，不是程式缺陷；該路徑的兩段行為分別由型別檢查與既有程式覆蓋
（`rowState="added"` 與 `ListTable` 用的是同一段 Mezzanine API）。若要補完，需要先在該儲位
建立一台載具。

後端四個屬性篩選另有 8 條整合測試把關（`libs/graphql/src/lib/stock-batch-attribute-filters.integration.spec.ts`），
其中一條專門盯住 `SO-1` 不得撈到 `SO-10`。
