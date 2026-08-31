# 宿主整合能力 — 規劃 / 實作計畫

> **Status: IMPLEMENTED（2026-08-31，尚未發佈）。** P1／P2／P3 全數完成並通過
> typecheck、lint、8 suites / 65 tests、三包 build。實作過程中修正了兩處與初版設計
> 不符之處，已回寫進本文：§3.3（resolver metadata 是 lazy 的，改為攔截寫入）與
> §4.3（規格改以 Figma 設計稿為準）。另修掉一個既有 bug，見 §9。
>
> 原始規劃內容如下。
>
> 本文回應 MogistSystem 的
> `docs/upstream-wms-requirements.md`（五項需求），把它翻譯成本 repo 的具體改動、
> 分期、版本與風險。撰寫基準：`core@0.5.0`、`graphql@0.8.0`、`react@0.2.3`
> （與需求文件的版本基準一致，五項缺口在 `main` 上皆確認存在）。
>
> 需求四（盤點）的規格**以 Figma 設計稿為權威來源**，非需求文件的推論：
> `RY2500065_WMS 倉儲管理核心開發` 頁面 **D. 盤點**（`node-id=464-29556`）——
> 已於 2026-08-30 逐頁核閱並轉譯為 §4.3～§4.5。
>
> 本檔位於 repo 根目錄 `docs/`，**不會**發佈到 npm。

## 0. 需求對照與現況確認

| 需求 | 主題                        | 現況確認（檔案:行）                                                          | 分期 |
| ---- | --------------------------- | ---------------------------------------------------------------------------- | ---- |
| 一   | 前端作業選單可依部署收斂    | `libs/react/src/components/inventoryActions/utils.ts:374` 模組層級硬編       | P1   |
| 二   | 庫存作業失敗要讓使用者看見  | `libs/react/src/components/inventoryActions/useApi.ts` 15 處 `console.error` | P1   |
| 三   | 後端部署層級 operation 開關 | `libs/graphql/src/lib/graphql.module.ts` 無註冊開關                          | P2   |
| 四   | 盤點頁是空殼                | `libs/react/src/components/pages/inventory-count/` 無任何 `*Document`        | P3   |
| 五   | `Maps` 權限語意不一致       | `libs/react/src/components/pages/maps/index.tsx:54` 未傳遞開關               | P1   |

需求一／二／五 全在 `libs/react`，彼此共用同一個注入點（`InventoryActionsProvider`），
且不需要後端配合，因此合併為 P1 一次出貨。需求三 需要 `core` + `graphql` 一起動。
需求四 是一個全新領域模型，量體遠大於其他四項，獨立成 P3。

---

## 1. 需求一：庫存作業選單依部署收斂

### 1.1 現況（已核對）

`inventoryActionOptions` 是模組層級 const array，三個消費點直接 import：

```
utils.ts:374  export const inventoryActionOptions = [...15 項...]
   |
   +-- inventory-list/Table/InventoryActionSelector.tsx:39   filter(condition)
   +-- inventory-list/Table/InventoryActionSelector.tsx:104  find(o => o.id === ...)
   +-- pages/label-search/index.tsx:23                       map(option => <Button/>)
```

抽屜的掛載點有兩處，都是對 `targetAction?.id` 做 switch，同樣沒有部署維度：

- `components/InventoryActionDrawers/index.tsx:71`（`InventoryList` / `Maps` 用）
- `components/pages/label-search/OperateArea/index.tsx:41`（`LabelSearch` 用）

`InventoryActionsProvider` 目前 props 只有 `children`。

### 1.2 設計

單一注入點放在 `InventoryActionsProvider`，向下透過既有的 `InventoryActionsContext` 傳遞。
`InventoryList` / `LabelSearch` / `Maps` 都在 provider 底下，因此三個寫入面自動一致，
消費端不需逐頁傳 props——這正是需求文件要的語意。

```
                InventoryActionsProvider
                 (enabled/disabled/filter)
                            |
                 InventoryActionsContext
                availableActionOptions[]
                isActionEnabled(action)
              /             |              \
   InventoryActionSelector  |          label-search/index
   (下拉選單來源)           |          (按鈕列來源)
                            |
              InventoryActionDrawers / OperateArea
                    (抽屜掛載前先 guard)
```

### 1.3 API

`libs/react/src/components/inventoryActions/InventoryActionsProvider.tsx`

```ts
export interface InventoryActionsProviderProps {
  readonly children?: ReactNode;
  /** 白名單：只啟用列出的作業。與 disabledActions 互斥。 */
  readonly enabledActions?: readonly InventoryActions[];
  /** 黑名單：停用列出的作業。與 enabledActions 互斥。 */
  readonly disabledActions?: readonly InventoryActions[];
  /** 逃生口：更細緻的判斷，與白／黑名單以 AND 結合。 */
  readonly actionFilter?: (action: InventoryActions) => boolean;
}
```

`libs/react/src/components/inventoryActions/InventoryActionsContext.ts` 新增兩個值：

```ts
readonly availableActionOptions: InventoryActionItem[];   // 已套用部署過濾
readonly isActionEnabled: (action: InventoryActions) => boolean;
```

`InventoryActionsContext` 的 `createContext` 預設值必須給「全開」的實作
（`availableActionOptions: inventoryActionOptions`、`isActionEnabled: () => true`），
否則沒包 provider 的既有消費端會整排消失。

### 1.4 改動清單

| 檔案                                                     | 改動                                                                              |
| -------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `inventoryActions/InventoryActionsProvider.tsx`          | 收 props、`useMemo` 算出 `availableActionOptions`、包裝 `setTargetAction`         |
| `inventoryActions/InventoryActionsContext.ts`            | context 型別與預設值加兩個欄位                                                    |
| `inventoryActions/utils.ts`                              | `inventoryActionOptions` 標 `@deprecated`，保留 export（不破壞既有 API）          |
| `pages/inventory-list/Table/InventoryActionSelector.tsx` | `:39` 與 `:104` 改讀 context                                                      |
| `pages/label-search/index.tsx`                           | `:23` 改讀 context                                                                |
| `components/InventoryActionDrawers/index.tsx`            | switch 前 `if (!targetAction \|\| !isActionEnabled(targetAction.id)) return null` |
| `pages/label-search/OperateArea/index.tsx`               | 同上                                                                              |
| `libs/react/src/index.ts`                                | export `InventoryActionsProviderProps`                                            |

### 1.5 語意保證（對應需求文件四點）

1. **停用等於不存在** — `availableActionOptions` 直接濾掉，不是 `disabled` 樣式。
2. **抽屜不掛載** — 兩個 switch 前 guard；再加一層：provider 包裝的 `setTargetAction`
   拒絕被停用的 action（擋深連結、殘留 state、以及消費端自行呼叫）。
3. **未設定行為不變** — 三個 prop 皆 optional，未給時 `availableActionOptions === inventoryActionOptions`。
4. **白／黑名單同時給** — `process.env.NODE_ENV !== 'production'` 時 `console.warn`，以白名單為準。

### 1.6 驗證

`libs/react` 目前沒有 test target（只有 `libs/graphql` 有 jest）。依全域規範，
本項以**下游 app 實測**驗收：在 `apps/client/src/auth/AuthorizedAdminPage/` 的 provider
傳入 `disabledActions={[InventoryActions.QualityInspection, InventoryActions.ReclassifyInventory]}`，
逐一確認：

- `/inventory-list` 下拉選單少兩項、勾選庫存後其餘作業仍可正常送出
- `/label-search` 按鈕列少兩項
- `/maps` 內嵌作業列少兩項
- 強制把 `targetAction` 設成被停用項時抽屜不掛載

---

## 2. 需求二：庫存作業失敗必須讓使用者看見

### 2.1 現況（已核對）

`useApi.ts` 15 個 `onSubmit` 的 catch 一律只有 `console.error(error)`。成功路徑則統一是
`Message.success(...)` + `resetAll()`。也就是說失敗時抽屜其實**會維持開啟**
（`resetAll()` 沒被呼叫），但畫面沒有任何訊息——使用者無從得知。

### 2.2 設計

抽出單一 helper，15 處 catch 一律改呼叫它，避免逐處複製貼上：

`libs/react/src/components/inventoryActions/useInventoryActionError.ts`

```ts
export function useInventoryActionError(): (error: unknown) => void;
```

行為：

1. `console.error(error)` 保留（開發診斷）。
2. 若 provider 有給 `onError` → 呼叫 `onError(targetAction.id, error)`，**不再**自行顯示。
3. 否則 `Message.error(extractGraphQLErrorMessage(error) ?? errorMessageFallback)`。

錯誤訊息萃取順序：`error.graphQLErrors[0].message` → `error.networkError.message`
→ `error.message` → fallback（預設 `'操作失敗，請稍後再試'`）。

Provider props 補兩項（與需求一同一個注入點）：

```ts
readonly onError?: (action: InventoryActions, error: unknown) => void;
readonly errorMessageFallback?: string;
```

### 2.3 注意事項

- catch 內**不可** re-throw。`onSubmit` 由 `react-hook-form` 的 `handleSubmit` 呼叫，
  throw 會變成未捕捉的 rejection，且 `formState.isSubmitting` 的解除時機會不一致。
- 目前 catch 吞掉錯誤讓 promise resolve，`isSubmitting` 應會正常解除；此點需在 P1 實測
  時逐一確認（需求文件寫「目前行為不明確」）。若發現某些抽屜是自管 loading state，
  一併補上失敗時的重置。

### 2.4 驗收情境（沿用需求文件的實測案例）

宿主以 `authChecker` 擋掉 `ship-inventory-order:update`，在出庫抽屜送出後應看到
`Message.error`，抽屜維持開啟、按鈕回到可按狀態、庫存未動。

---

## 3. 需求三：後端部署層級 operation 開關

### 3.1 現況（已核對）

`@WmsOperation({ resource, action })` 目前共 **68 支** root operation，但只有
**48 個**不同的 `resource:action` 組合——也就是 **`resource:action` 並非一對一對應到
GraphQL 欄位**，11 組 requirement 被多支 query/mutation 共用：

| requirement                    | 對應 root 欄位數 |
| ------------------------------ | ---------------- |
| `loader:read`                  | 6                |
| `stock:read`                   | 5                |
| `material:read`                | 3                |
| `loader:create`                | 3                |
| `loader:update`                | 2                |
| `location:read`                | 2                |
| `sale-order:read`              | 2                |
| `transfer-order:read`          | 2                |
| `receive-inventory-order:read` | 2                |
| `ship-inventory-order:read`    | 2                |
| `ship-inventory-order:ship`    | 2                |

這一點**必須寫進文件**：停用 `loader:read` 會一次移除 6 支 query。需求文件把
`WmsOperationName` 定義為 `${resource}:${action}`，語意上等同「停用這個資源的這個動作」，
對宿主的用途（停 `material:create`、`receive-inventory-order:*`、
`quality-inspection-order:inspect`、`reclassify-inventory-order:reclassify`）是對的，
但我們要提供更細的逃生口。

### 3.2 API

`libs/core/src/lib/constants/operations.ts`（新檔，零執行期相依，純字串）

```ts
export type WmsOperationName =
  | 'material:read' | 'material:create' | 'material:update'
  | 'ship-inventory-order:ship'
  /* …48 項… */;

export const WMS_OPERATION_NAMES: readonly WmsOperationName[] = [ /* 同上 */ ];
```

放 `core` 而非 `graphql` 的理由：`graphql` 已相依 `core`，且未來若要讓
`react` 也共用同一份字串（見 §3.6），`core` 是唯一兩邊都能碰到的地方。

`libs/graphql/src/lib/graphql.module.ts`

```ts
export type WmsModuleGraphqlModuleAsyncOptions = /* …既有… */ & {
  /** 白名單：只註冊列出的 operation。與 disabledOperations 互斥。 */
  readonly enabledOperations?: readonly WmsOperationName[];
  /** 黑名單：不註冊列出的 operation。與 enabledOperations 互斥。 */
  readonly disabledOperations?: readonly WmsOperationName[];
  /** 逃生口：以 GraphQL 欄位名精準停用單一 query/mutation。 */
  readonly disabledFields?: readonly string[];
};
```

`disabledFields` 就是為了 §3.1 的粒度問題——宿主若只想停掉 `loader:read` 六支裡的一支，
用欄位名指定。

### 3.3 實作機制（已實作，與初版設計不同）

新檔 `libs/graphql/src/lib/registry/operation-registry.ts`，由 `forRootAsync` 同步呼叫。

**初版設計是錯的。** 原本規劃「在 `forRootAsync` 濾掉 `TypeMetadataStorage.queries /
.mutations`」——實測時那兩個陣列在該時點是**空的**。`@nestjs/graphql` 的 resolver
metadata 是 **lazy** 的：`@Query()` / `@Mutation()` 只往 `LazyMetadataStorage` 塞一個
thunk，真正呼叫 `addQueryMetadata` 要等 `GraphQLSchemaBuilder.build()` 載入時才發生。

實際採用的做法是兩個時點各做一件事：

```
forRootAsync（現在）
  └─ 走訪 exportDependencies 每個 prototype method
       ├─ RESOLVER_TYPE_METADATA 必須是 'Query' 或 'Mutation'（濾掉 @ResolveField）
       ├─ schemaName = RESOLVER_NAME_METADATA ?? methodName
       ├─ requirement = Reflect.getMetadata(WMS_OPERATION_METADATA, handler)
       └─ 命中 → delete prototype[methodName]，並記進 prunedMethods
  └─ 一次性包裝 TypeMetadataStorage.addQueryMetadata / addMutationMetadata

schema build（稍後）
  ├─ ResolversExplorerService.explore()  ← 掃 prototype，已刪的掃不到
  └─ LazyMetadataStorage.load() → add*Metadata → 被包裝函式擋下
```

兩件事**必須成對**（`graphql.factory.js:24` 先 explore、`:31` 才 build）：

- 只刪 prototype → SDL 仍宣告該欄位，解析成 `null`（看得到但是死的）。
- 只擋 metadata → resolver map 有 `Query.foo` 但 typeDefs 沒有，
  `makeExecutableSchema` 直接以 `requireResolversToMatchSchema` 拒絕整份 schema。

刪掉 prototype method **不會**影響 lazy thunk 的型別反射：`design:returntype` 是掛在
prototype ＋ property key 上，不是掛在 function 物件上，delete 之後仍讀得到。

`RESOLVER_TYPE_METADATA` 與 `RESOLVER_NAME_METADATA` 都是 `@nestjs/graphql` 的**公開
export**，不是私有欄位——這比初版設計對 `TypeMetadataStorage` 私有陣列的依賴穩固得多。

### 3.4 為什麼不用 `transformSchema`

`GraphQLModule.forRoot({ transformSchema })` 是官方擴充點，用 `@graphql-tools/utils` 的
`filterSchema` + `pruneSchema` 也能濾掉欄位，但：

- `transformSchema` 在 `autoSchemaFile` **寫檔之後**才跑
  （`graphql.factory.js:31` 產檔 → `:53` 才 transform），宿主 commit 的 `schema.gql`
  仍會含被停用欄位，前端 codegen 依然看得到——正是需求文件想解決的雜訊。
- 需要宿主自己在 `GraphQLModule.forRootAsync` 裡多接一個 option，不是「一處設定」。

因此以 §3.3 為主要機制；`createWmsSchemaFilter()`（回傳一個 `transformSchema` 函式）
列為 **fallback**，在 §3.7 的 feature-detect 失敗時由文件引導宿主改用。

### 3.5 語意保證（對應需求文件三點）

1. **不出現在 introspection** — 由 §3.3 保證（連 SDL 產檔都不含）。
2. **不影響 service 注入** — 只動 `libs/graphql` 的 resolver class prototype，
   完全不碰 `WmsModuleCoreModule` 的 providers。`ReceiveInventoryOrderService` 等
   仍照常 export、照常可直呼。這點會用一支測試釘住。
3. **未設定時全部註冊** — 三個 prop 皆 optional，未給時完全跳過 §3.3 的走訪。

另外：`@ResolveField` 沒有 `WMS_OPERATION_METADATA`，天然不受影響（符合現有慣例）。

### 3.6 加分項：前後端共用一份設定

需求文件反推的 15 筆對照表，經核對 `useApi.ts` 的 Document 引用**完全正確**。
落地方式：

- `libs/react/src/components/inventoryActions/operations.ts`（新檔）
  `INVENTORY_ACTION_OPERATIONS: Readonly<Record<InventoryActions, string>>`，15 筆。
- 從 `libs/react/src/index.ts` export，宿主即可寫
  `disabledActions = DISABLED_OPS.flatMap(op => actionsForOperation(op))`。
- **防漂移測試**：`libs/graphql` 的 jest 內加一支 spec，用 `fs` 讀
  `libs/react/src/components/inventoryActions/operations.ts` 的字串集合，
  斷言每個值都在 `WMS_OPERATION_NAMES` 內。跨 lib 直接 import 會踩 Nx module boundary
  與 ESM/瀏覽器相依問題，所以用檔案掃描而非型別耦合。

`react` 不改為相依 `core`——只複製字串常數並用測試釘住，維持 `libs/react` 的
瀏覽器端零後端相依。

### 3.7 風險與緩解

| 風險                                                   | 緩解                                                                                                                              |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| 依賴 `TypeMetadataStorage.queries/.mutations` 私有欄位 | 啟動時 feature-detect（陣列存在且元素有 `target`/`methodName`），偵測不到就 throw 明確錯誤並指向 `createWmsSchemaFilter` fallback |
| `@nestjs/graphql` 升版改結構                           | §3.9 的整合測試會在升版時立刻紅燈；`package.json` peer 範圍鎖 `^13`                                                               |
| prototype 刪除是 process 全域副作用                    | 文件明載「一個 process 只能註冊一次 `WmsModuleGraphqlModule`」；jest 每個 test file 有獨立 module registry，不互相污染            |
| 停用某 query 會讓 `libs/react` 對應頁面壞掉            | README 加對照：停 `material:read` → 不要掛 `MaterialsManagement`；停用 query 前先確認側欄已移除該頁                               |
| `resource:action` 粒度過粗（§3.1）                     | 提供 `disabledFields` 逃生口 + README 列出一對多的 6 組                                                                           |

### 3.8 版本相容

三個 prop 全部 optional、預設行為不變 → `core` / `graphql` 皆為 **minor**。

### 3.9 測試

新增 `libs/graphql/src/lib/operation-registration.integration.spec.ts`
（沿用 `custom-entities.integration.spec.ts` 的 Postgres harness 與 `GraphQLSchemaHost`）：

1. 未設定 → schema 含全部 root 欄位（基準快照）。
2. `disabledOperations: ['quality-inspection-order:inspect', 'material:create']`
   → `printSchema` 不含 `inspectMaterials` / `createMaterial`，其餘欄位完好。
3. 同上設定下，`app.get(ReceiveInventoryOrderService)` 仍可解析（釘住 §3.5.2）。
4. `disabledFields: ['availableLoaders']` → 只掉那一支，其他 `loader:read` query 還在。
5. `enabledOperations` 與 `disabledOperations` 同時給 → throw。
6. 不變式測試：掃描全部 `@WmsOperation` 的 requirement 集合 === `WMS_OPERATION_NAMES`
   （新增 operation 忘了加進 union 就會紅燈）。

---

## 4. 需求四：盤點（P3，**已決定納入本輪**）

### 4.1 現況（已核對）

- `pages/inventory-count/Table/index.tsx` — `columns: []`、`dataSource: []`
- `pages/inventory-count/CreateForm/index.tsx` — `onSubmit` 只有 `console.log('建立盤點', values)`
- 整個目錄 grep 不到任何 `*Document`
- `core` 沒有 `InventoryCountService`；`ChangeType` 沒有盤點相關項
- 但 `libs/react/src/index.ts:10` 有對外 export `InventoryCount`

需求文件的偏好是**實作**（歷史庫存回補一律進 `DEFAULT` 儲位，原本規劃靠盤點修正）。

#### 分兩段落地（P3-a / P3-b）

**P3-a（跟 P1 一起出，成本極低）** — 在 P3-b 完成前先止血：在 `libs/react/README.md`
與 `InventoryCount` 的 TSDoc 標註 `@deprecated 未實作 — 尚無後端串接，請勿掛上側欄`。
**不移除 export**，理由見 §4.8。P3-b 完成時把標註拿掉。

**P3-b** — 依 §4.3～§4.5 實作盤點領域（core + graphql + react）。

### 4.2 權威來源：Figma 設計稿

盤點的規格**以設計稿為準**，不採用需求文件的推論：

> `RY2500065_WMS 倉儲管理核心開發` → 頁面 **D. 盤點**（`node-id=464-29556`）
> https://www.figma.com/design/3rBlE6ssq1ppdgCpgl0HkY/

設計稿已完整畫出流程、狀態、欄位與規則 Note，本節即為其轉譯。與 §8 先前決策的差異
整理在 §4.5。

### 4.3 設計稿轉譯的規格

#### 4.3.1 流程與狀態

```
建立盤點 ──▶ 尚未執行 ──開始盤點──▶ 盤點中 ──執行盤差──▶ 已完成
                │                      │
                └────── 取消盤點 ──────┴──────▶ 已取消
```

- 四個狀態：`尚未執行` / `盤點中` / `已完成` / `已取消`。
- **完成盤差後狀態才變「已完成」**；未完成盤差則持續顯示「盤點中」（狀態 Note）。
- 「取消盤點」在 `尚未執行` 與 `盤點中` 都可執行，均帶確認 Modal。
- **執行盤差期間鎖定整頁**：不可暫停、取消或離開，直至完成（`Modal_執行盤差_loading`）。
  設計 Note 明言此限制是為了資料一致性與避免庫存調整中斷。

#### 4.3.2 盤點列表頁

| 區塊 | 內容                                                 |
| ---- | ---------------------------------------------------- |
| 篩選 | 名稱、盤點日期（區間）、盤點範圍、建立者、狀態       |
| 表格 | 操作（檢視）、名稱、盤點範圍、盤點日期、建立者、狀態 |
| 動作 | `+ 建立盤點`                                         |

#### 4.3.3 建立盤點 Modal

| 欄位     | 規則                                           |
| -------- | ---------------------------------------------- |
| 名稱     | 必填，純文字輸入框                             |
| 盤點日期 | 必填，日期選擇器（單日，非區間）               |
| 盤點範圍 | 必填，**Multi-select + Auto-complete**（儲位） |

「盤點範圍」的 chip 值形如 `1000A1B`，而表格「儲存位置」欄是 `1000A1BC`——**範圍是儲位
節點（前綴），其下所有儲位的庫存都納入單身**。

#### 4.3.4 盤點檢視頁

Info 層（名稱／盤點日期／盤點範圍／建立者／狀態）：**僅在「尚未執行」時可編輯**，
其餘狀態唯讀（Info 層 Note）。

庫存項目表格欄位（完整 16 欄）：

```
操作 | 盤點數量 | 帳面數量 | 單位 | 待檢驗 | 凍結 | 調撥 | 料號 | 物料說明
     | 批號 | 儲存位置 | 載具 | 供應商 | 客戶 | 銷售訂單號碼 | 銷售訂單項次
```

- **`待檢驗` / `凍結` / `調撥` 是「標示欄」而非排除條件**——這些庫存**照樣列入盤點清單**，
  只是以 icon 標記狀態。
- 表格篩選：料號、物料說明、批號、儲存位置、載具（＋進階搜尋）。
- **快速篩選**：點擊表格內對應欄位的數值即自動套入 filter 查詢，適用 8 欄
  （料號／批號／儲存位置／載具／供應商／客戶／銷售訂單號碼／銷售訂單項次）。
- **「顯示盤差項目」Toggle**：開啟後僅列出有盤點差異的項目。

頁尾按鈕依狀態變化：

| 狀態     | 頁首                       | 頁尾                             |
| -------- | -------------------------- | -------------------------------- |
| 尚未執行 | 下載盤點清單               | 取消盤點 ／ 開始盤點             |
| 盤點中   | 下載盤點清單、上傳盤點結果 | 取消盤點 ／ 暫存結果 ／ 執行盤差 |
| 已完成   | 下載盤點清單               | —                                |
| 已取消   | 下載盤點清單               | —                                |

#### 4.3.5 盤點數量與單位

- 盤點數量欄**僅在「盤點中」可編輯**，其餘狀態 Disabled 唯讀（盤點數量 Note）。
- 兩種輸入方式：**手動輸入** 與 **檔案上傳**——上傳後系統解析內容，把數值自動帶入
  Input 欄位。
- 單位欄是 Select，可切換（沿用既有 `unitId` 換算機制）。
- **在執行盤差之前，盤點量都只是「暫存的對帳資料」**，不影響實際庫存
  （狀態與按鈕行為規則 Note）。

#### 4.3.6 新增庫存（盤盈）

`+ 新增庫存` 僅在「盤點中」出現，開 `Modal_新增庫存`，六個欄位**全部必填**：

| 欄位     | 規則                                                               |
| -------- | ------------------------------------------------------------------ |
| 料號     | 單選，Auto-complete                                                |
| 批號     | 單選，選完料號後帶預設值，**可編輯預設值**（等同可建新批號）       |
| 儲存位置 | 單選，Auto-complete，12 字英文                                     |
| 載具     | 單選，**需先選儲存位置**才能編輯，Auto-complete                    |
| 盤點數量 | 只能數字＋小數點                                                   |
| 單位     | **需先選料號**才能編輯，預設值取自料號 metadata，選項最長 5 碼英文 |

新增的列在表格中：**帳面數量 = 0**、操作欄有刪除鈕。
**只有新增的列可刪除，既有列一律鎖定**（新增欄位 Note）。
新增後該列**自動置頂並高亮 3 秒**，之後回復一般樣式（新增項目排序 Note）。

#### 4.3.7 匯入／匯出檔案格式（本計畫設計，待設計確認）

設計稿只寫「上傳後解析內容並帶入 Input」，格式未定。以下為本計畫的提案。

**下載盤點清單**（`CSV`，UTF-8 **with BOM**，讓 Excel 正確辨識中文）

```
盤點單號,項目識別碼,料號,物料說明,批號,儲存位置,載具,帳面數量,單位,盤點數量
IC2508300001,3f9a…c1,WATER2B003,200ml 礦泉水,2510310042,1000A1BC,BY0093,100,BOT,
```

`盤點數量` 留空供現場填寫。`項目識別碼` 是單身的 uuid，作為回傳時的主要對應鍵。

**上傳盤點結果**（`CSV`）

- 對應鍵優先序：① `項目識別碼`；② 缺漏或被改動時，用
  **料號＋批號＋儲存位置＋載具** 四欄組合比對。
- 只讀 `盤點數量` 與 `單位` 兩欄，其餘欄位忽略（允許現場在檔案裡加註記）。
- 四個自然鍵齊全但不在單身中的列 → 提示使用者是否作為**新增庫存（盤盈）**列加入。
- 逐列驗證（數量非數字／單位不存在／料號不存在／重複列），**彙整成錯誤清單一次顯示，
  不中斷其他列**；驗證通過的列才帶入 Input。
- 解析結果只進表單狀態，仍需按「暫存結果」或「執行盤差」才進後端。

**第一版只支援 CSV，不支援 XLSX。** `libs/react` 目前沒有任何 CSV/XLSX 相依，加一個
就要同步改 `package.json` 的 `peerDependencies` 與 `rollup.config.mjs` 的
`externalPatterns`（見 §CLAUDE.md「Rollup externals must track peer deps」）。CSV 的
產生與解析各約 30 行手寫程式即可，零新依賴。若日後需要 XLSX，再以 optional peer dep
＋ dynamic import 加上，不影響既有消費端。

### 4.4 後端契約（由 §4.3 推導）

| Operation                           | 對應 UI      | 備註                                               |
| ----------------------------------- | ------------ | -------------------------------------------------- |
| `inventory-count-order:read`        | 列表／檢視頁 | 兩支 query                                         |
| `inventory-count-order:create`      | 建立盤點     | 依範圍展開單身                                     |
| `inventory-count-order:update`      | Info 層編輯  | 僅「尚未執行」可用                                 |
| `inventory-count-order:start`       | 開始盤點     | 尚未執行 → 盤點中；**快照＋鎖定儲位**（§4.5）      |
| `inventory-count-order:count`       | 暫存結果     | 寫入盤點數量／單位，不動庫存                       |
| `inventory-count-order:add-item`    | 新增庫存     | 建立盤盈列（必要時建批號）                         |
| `inventory-count-order:remove-item` | 刪除盤盈列   | 僅限新增的列                                       |
| `inventory-count-order:reset`       | 清空重填     | 清空所有盤點數量並移除盤盈列（§4.7.3）             |
| `inventory-count-order:cancel`      | 取消盤點     | → 已取消；**解除鎖定**                             |
| `inventory-count-order:settle`      | 執行盤差     | 唯一會改庫存的一支；單一 transaction；**解除鎖定** |

事件：`inventory-count-order.{created,updated,started,counted,reset,cancelled,settled}`；
庫存事件只在 `settle` 發生 → `stock.count-gained` / `stock.count-lost`。

#### 盤差計算

盤點數量填的是**當下實際數量**（絕對值，非差異）。`settle` 對每一列計算：

```
delta = 盤點數量(換算成基本單位) − 帳面數量
  delta > 0 → 盤盈 → inventory_count_order_changes(+) → ChangeType.COUNT_GAINED
  delta < 0 → 盤虧 → inventory_count_order_changes(−) → ChangeType.COUNT_LOST
  delta = 0 → 不寫 change
```

因為儲位在「開始盤點」時就被鎖住（§4.5），**快照帳面量 == 結算當下帳面量**，
先前列為待確認的「delta 基準」問題自然消解——兩者必然相等，取任一皆可；
實作以快照為準並在 `settle` 前重驗一次，不相等即代表鎖定被繞過，直接中止。

#### 盤差日期

「盤點日期」是**開始日／基準日**，盤差要記在這一天：

- `inventory_count_orders.countDate`（`date`，必填）承載此語意。
- **不去覆寫 `orders.createdAt`**——那是自動的 `CreateDateColumn`，保留真實執行時間供
  稽核；覆寫會讓 orders 表的時間軸失真。
- 所有以「盤差日期」為名的呈現（DTO 欄位、異動紀錄、匯出）一律讀 `countDate`。
- ⚠️ 連帶影響：`C. 異動紀錄` 是跨單別的統一清單，其餘單別以 `createdAt` 排序／篩選，
  盤點類則需以 `countDate`。這個不一致要在異動紀錄的 query 明確處理，見 §4.7「剩餘待確認」第 2 點。

實作要點（沿用既有慣例）：

- 盤點單三個 entity **不是**可覆寫實體（不在 `WmsEntities` 內），依 CLAUDE.md 的非對稱
  規則直接以 class 引用。
- 每支 mutation 都要 `@WmsOperation` + `@WmsMutationEvent`，並補進 §3.2 的
  `WMS_OPERATION_NAMES`——§3.9.6 的不變式測試會在漏加時紅燈。
- `settle` 必須在單一 `dataSource.transaction` 內完成並 `await`，否則
  `WmsMutationInterceptor` 的 post-commit 保證會破。
- 盤盈盤虧走既有 `*_order_change` 表 + `StockChangeSubscriber`
  （`TABLE_TO_CHANGE_TYPE` 加 `inventory_count_order_changes`，依 `quantityChanged`
  正負分 `COUNT_GAINED` / `COUNT_LOST`），服務層不需自己發事件。
- 新批號在 `settle` 的同一個 transaction 內經 `BatchService` 建立，避免孤兒列。

### 4.5 開始盤點的儲位鎖定

「開始盤點」除了快照帳面量，還要**鎖定盤點範圍內（含所有下層）儲位的庫存異動作業**，
直到 `settle` 或 `cancel` 為止。這是盤點最重要的一致性保證，也是唯一一個**跨出盤點領域、
會影響既有 15 種庫存作業**的需求。

#### 鎖定範圍的計算

`LocationEntity` 是 `parent` / `children` 的鄰接串列樹（`@rytass/wms-base-nestjs-module`
的 `location.entity`），**沒有 materialized path**，所以「某節點的所有子代」要用遞迴查詢：

```sql
WITH RECURSIVE subtree AS (
  SELECT id FROM locations WHERE id = ANY($1)
  UNION ALL
  SELECT l.id FROM locations l JOIN subtree s ON l."parentId" = s.id
)
SELECT id FROM subtree;
```

盤點單建立時就把展開後的儲位集合落地成 `inventory_count_order_locations`
（單頭 ↔ 儲位的多對多），`start` 時直接讀，避免每次異動都跑遞迴。

#### 攔截點：TypeORM subscriber，不改 service

與 `StockChangeSubscriber` 用同一個 choke point——**在 `*_order_change` 的 `beforeInsert`
檢查**，命中鎖定儲位就 throw：

```
任一 *_order_change 即將 insert
  └─ 取 item.locationId（與 StockChangeSubscriber 相同的取法）
       └─ locationId ∈ 任一「盤點中」單的鎖定集合 ?
            ├─ 是 → throw（transaction 回滾）
            └─ 否 → 放行
   例外：inventory_count_order_changes 自己不受檢（盤差本身要能寫）
```

這樣做的理由與 CLAUDE.md 對 `StockChangeSubscriber` 的評語一致：**服務層完全不動，
任何新的 change 寫入路徑自動被涵蓋**——包含宿主直呼 service 的路徑（如 MogistSystem 的
`WmsInboundService`），那正是需要被擋下的情境。

效能：鎖定集合以「盤點中的單」為單位快取（單量極少，變動只發生在 start／settle／cancel），
subscriber 內做 Set 查表，不打 DB。

#### 連帶規則

- **新增庫存（盤盈）的儲存位置必須落在鎖定範圍內。** 否則 `settle` 會動到沒被鎖的儲位，
  破壞一致性。此為本計畫由鎖定語意推導的規則，設計稿未明示。
- 前端被擋下時的錯誤呈現，正好靠**需求二**（§2）的 `Message.error` 機制——這是 P1 先出
  的另一個好處。
- 錯誤訊息要能指出是哪一張盤點單鎖住了該儲位，否則現場無從排除。

### 4.6 與先前決策的差異（設計稿覆蓋）

| 先前 §8 決策／假設                  | 設計稿實際                                         | 處置     |
| ----------------------------------- | -------------------------------------------------- | -------- |
| 型態 A：只做數量校正                | 一致——設計無儲位校正                               | 維持     |
| 盤盈可建新批號                      | 一致——批號欄「可編輯預設值」                       | 維持     |
| 盤點範圍可選填，未指定即全倉        | **必填**，且只有「儲位」一種，Multi-select         | **改**   |
| 依料號篩選範圍                      | 無此設計（料號只是表格篩選）                       | **移除** |
| 凍結／調撥中的庫存建單時濾掉        | **照列**，以待檢驗／凍結／調撥三個 icon 欄標示     | **改**   |
| 狀態機 `DRAFT → COUNTING → SETTLED` | `尚未執行 → 盤點中 → 已完成`（＋已取消）           | 命名對齊 |
| 單身可分次填寫                      | 一致——有「暫存結果」按鈕                           | 維持     |
| （未規劃）                          | 下載盤點清單／上傳盤點結果                         | **新增** |
| （未規劃）                          | 顯示盤差項目 Toggle、快速篩選 8 欄、新增列置頂高亮 | **新增** |
| （未規劃）                          | 執行盤差期間鎖定整頁                               | **新增** |
| （未規劃）                          | Info 層僅「尚未執行」可編輯                        | **新增** |
| 單位固定                            | 單位可切換，預設取自料號 metadata                  | **改**   |
| 盤點期間不鎖庫存                    | **開始盤點即鎖定範圍內全部下層儲位**（PM 確認）    | **改**   |
| 未規劃「重新盤點」                  | 盤點中可清空重填（PM 確認）                        | **新增** |
| 盤差日期＝執行日                    | **盤差日期＝盤點日期（基準日）**（PM 確認）        | **改**   |

### 4.7 PM 已確認事項（2026-08-30）與剩餘問題

先前列出的六個問題已全部得到答覆：

| #   | 問題             | 答覆                                                       | 落點            |
| --- | ---------------- | ---------------------------------------------------------- | --------------- |
| 1   | 帳面數量定版時機 | **開始盤點時快照，且鎖定關聯儲位的異動作業**               | §4.4 / **§4.5** |
| 2   | 盤差計算基準     | **填的就是當下數量，系統算 diff 後寫盤盈／盤虧**           | §4.4 盤差計算   |
| 3   | 重新進行盤點作業 | **可以清空重填**                                           | §4.7.3          |
| 4   | 上傳檔案格式     | 交由本計畫設計                                             | §4.3.7          |
| 5   | 盤點日期語意     | **開始日／基準日，盤差日期要記在這一天**；不需在盤差時校驗 | §4.4 盤差日期   |
| 6   | 盤點範圍層級     | **是，選一個節點其下層會全鎖**                             | §4.5            |

#### 4.7.3 清空重填的範圍

「清空重填」對應 `inventory-count-order:reset`，僅在「盤點中」可用。本計畫定義為：

- 清空所有單身的 `盤點數量` 與 `單位`（回到未填狀態）；
- **一併移除所有新增的盤盈列**（它們同樣是盤點結果的一部分）；
- **不解除儲位鎖定**、不改狀態（維持「盤點中」），因為現場是要重新量測而非中止作業；
- 帳面數量快照**不重新取樣**——儲位自開始盤點起就鎖住，帳面量本來就沒變。

#### 剩餘待確認（不阻擋開工）

1. **`reset` 是否需要二次確認 Modal。** 它會丟掉現場已填的資料，行為上與「取消盤點」
   同級。設計稿未畫此按鈕，本計畫暫定：**加確認 Modal**，文案比照取消盤點。
   按鈕位置暫定放在「盤點中」頁尾，介於「取消盤點」與「暫存結果」之間。
2. **異動紀錄的日期一致性。** §4.4 已說明盤點類異動要以 `countDate` 呈現，其餘單別維持
   `createdAt`。需確認 `C. 異動紀錄` 頁的排序／日期篩選要不要一併改用「業務日期」語意
   （會影響既有頁面行為），或僅在顯示欄位上區分。
3. **鎖定期間的錯誤文案。** 被鎖儲位的庫存作業被擋下時，訊息要不要指名是哪一張盤點單
   （利於現場排除，但等於把盤點單資訊洩漏給該操作者）。本計畫暫定**指名單號**。
4. **§4.3.7 的 CSV 欄位與對應鍵**需設計／現場確認，尤其「四個自然鍵比對」在載具為空
   （`loaderId` 可為 null）時的行為。

### 4.8 為什麼不撤下 `InventoryCount` 的 export

既然決定實作，撤下反而是最差解：撤下 export 是 breaking change（任何已
`import { InventoryCount }` 的消費端會編譯失敗），必須開 `react@1.0.0`；等 P3-b
做完又要把它加回來，等於讓消費端白白經歷一次 major。

不撤下的唯一成本是「P3-b 完成前，宿主 `npm install` 拿到的仍是空殼」——一張永遠空的表
加一個只會 `console.log` 的建立按鈕。這個成本用 §4.1 的 P3-a（TSDoc `@deprecated`
＋ README 標註）就能降到接近零：型別提示會在 IDE 直接顯示刪除線與說明，宿主不會誤掛側欄。

**結論：保留 export，P1 補標註，P3-b 完成時移除標註。全程不需要 major。**

---

## 5. 需求五：`Maps` 的作業列開關

### 5.1 現況（已核對）

`pages/inventory-list/Table/index.tsx:25` 已經有 `haveInventoryActionsSystem?: boolean`
（預設 `true`），但 `pages/maps/index.tsx:54` 只傳了 `onlyListMode`，沒把開關往上開放。
所以 `/maps` 確實是第三個庫存寫入面。

### 5.2 改動

```ts
// libs/react/src/components/pages/maps/index.tsx
interface MapsProps {
  readonly haveInventoryActionsSystem?: boolean;
}

function Maps({ haveInventoryActionsSystem = true }: MapsProps) { /* 往下傳 */ }
```

`libs/react/src/index.ts` 一併 export `MapsProps`。

### 5.3 預設值（已決定）

**維持 `true`**（純 additive，minor 出貨，不動既有消費端），並在 README 標註
「下一個 major 會把預設改為 `false`」。宿主現在就能用
`<Maps haveInventoryActionsSystem={false} />` 拿到想要的語意。

---

## 6. 分期、版本、發佈

| 分期 | 內容                         | 影響套件           | 版本                                              |
| ---- | ---------------------------- | ------------------ | ------------------------------------------------- |
| P1   | 需求一 + 二 + 五 + P3-a 標註 | `react`            | `0.2.3` → `0.3.0`（minor，全 additive）           |
| P2   | 需求三 + §3.6 對照表         | `core` + `graphql` | `core 0.5.0` → `0.6.0`；`graphql 0.8.0` → `0.9.0` |
| P3   | 需求四 盤點（已納入）        | 三包               | 各再一個 minor                                    |

P1 與 P2 之間沒有相依，可平行；但 §3.6 的對照表橫跨 `react`（常數）與 `graphql`（測試），
建議常數隨 P1 出、防漂移測試隨 P2 出。

發佈依 `RELEASING.md` 手動流程（`yarn release` → `yarn release:publish --otp=NNNNNN`），
無 CI publish。

## 7. 驗收條件對照（回應需求文件 §驗收條件）

| 宿主驗收項                                          | 由哪一項滿足    | 驗證方式                                            |
| --------------------------------------------------- | --------------- | --------------------------------------------------- |
| 一處設定 `disabledActions`，三個寫入面同步收斂      | 需求一（P1）    | `apps/client` 實測三頁 + 抽屜不掛載                 |
| 一處設定 `disabledOperations`，mutation 不進 schema | 需求三（P2）    | `operation-registration.integration.spec.ts` §3.9.2 |
| 直呼 service 的入庫同步不受影響                     | 需求三（P2）    | 同上 §3.9.3                                         |
| 任何庫存作業失敗使用者看得到錯誤                    | 需求二（P1）    | `authChecker` 擋 `ship-inventory-order:update` 實測 |
| 前後端兩份設定由同一份常數推導                      | §3.6（P1 + P2） | 防漂移測試                                          |

## 8. 決策紀錄與待辦

已決策（2026-08-30）：

1. **需求四盤點納入本輪** — 依 §4.1 分 P3-a（標註止血，隨 P1 出）／P3-b（實作）兩段。
2. **盤點規格以 Figma「D. 盤點」設計稿為準** — 已轉譯為 §4.3～§4.5；
   型態 A（只做數量校正）＋盤盈可建新批號的方向與設計一致，其餘假設依設計修正。
3. **`Maps` 預設值維持 `true`** — 走 minor，下個 major 再翻轉（§5.3）。
4. **`InventoryCount` 的 export 不撤下** — 撤下是 breaking，且實作完又要加回來；
   改以 `@deprecated` 標註止血（§4.8）。全程不需要 major，三包皆為 minor。

待辦（開工順序）：

- P1 可立即開工（需求一／二／五 + P3-a 標註），無前置條件。
- P2 可與 P1 平行。
- P3-b 的規格已依 Figma 設計稿轉譯完成（§4.3／§4.4），且 §4.7 的六個問題已由 PM 答覆，
  可開工。**新增的跨領域工作是 §4.5 的儲位鎖定**——它會影響既有 15 種庫存作業，
  建議排在盤點單本體之後、`settle` 之前實作，並補一支整合測試釘住「鎖定期間任何
  `*_order_change` 寫入都被擋下」。
- §4.7「剩餘待確認」的四點不阻擋開工，皆已給暫定值。

---

## 9. 實作過程中發現的既有 bug

`WarehouseMapDataService.onApplicationBootstrap()` 用 fire-and-forget 開 transaction
（`this.dataSource.transaction(...)` 沒有 `await`，也沒有 catch）。Nest 不會等待非
Promise 的回傳值，所以 `app.init()` resolve 之後那筆 transaction 還在飛；只要 app
很快關閉（測試、短命 worker），連線池被銷毀就變成 **unhandled rejection 直接殺掉
process**，錯誤訊息是 `QueryFailedError: Connection terminated`。

這是在寫 §3.9 的註冊開關整合測試時撞到的——該測試 boot 完幾乎立刻 close，正好踩中。
修法是把它改成 `async` 並 `await` 該 transaction，與 CLAUDE.md「mutation resolvers
must await all their DB writes（never fire-and-forget）」是同一條原則。

檔案：`libs/core/src/lib/services/warehouse-map.service.ts`
