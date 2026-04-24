# WMSMapModalContent 元件使用文件

## 元件總覽

`WMSMapModalContent` 是一個基於 React Flow 的倉庫地圖編輯器，支援**底圖上傳**、**矩形繪製**、**手繪路徑**三種圖層，有完整的 undo/redo、右鍵選單、文字編輯等功能。

來自套件 `@rytass/wms-map-react-components`。

---

## 基本用法

```tsx
import { useState, useCallback } from 'react';
import {
  WMSMapModalContent,
  EditMode,
  ViewMode,
  DrawingMode,
} from '@rytass/wms-map-react-components';

function MapEditor() {
  const [editMode, setEditMode] = useState(EditMode.BACKGROUND);
  const [drawingMode, setDrawingMode] = useState(DrawingMode.NONE);
  const [selectedColor, setSelectedColor] = useState('#FF6B6B');

  const handleEditModeChange = useCallback((mode: EditMode) => {
    setEditMode(mode);
    setDrawingMode(DrawingMode.NONE); // 切換模式時重設繪圖工具
  }, []);

  const handleToggleRectangleTool = useCallback(() => {
    setDrawingMode((prev) =>
      prev === DrawingMode.RECTANGLE ? DrawingMode.NONE : DrawingMode.RECTANGLE,
    );
  }, []);

  const handleTogglePenTool = useCallback(() => {
    setDrawingMode((prev) =>
      prev === DrawingMode.PEN ? DrawingMode.NONE : DrawingMode.PEN,
    );
  }, []);

  const handleUpload = useCallback(async (files: File[]): Promise<string[]> => {
    // 替換成實際上傳邏輯，回傳 URL 陣列
    return files.map((file) => URL.createObjectURL(file));
  }, []);

  return (
    <WMSMapModalContent
      editMode={editMode}
      viewMode={ViewMode.EDIT}
      drawingMode={drawingMode}
      colorPalette={['#FF6B6B', '#4ECDC4', '#45B7D1']}
      selectedColor={selectedColor}
      onEditModeChange={handleEditModeChange}
      onToggleRectangleTool={handleToggleRectangleTool}
      onTogglePenTool={handleTogglePenTool}
      onColorChange={setSelectedColor}
      onUpload={handleUpload}
    />
  );
}
```

---

## Props 一覽

| Prop | 型別 | 必填 | 說明 |
|------|------|:----:|------|
| `editMode` | `EditMode` | Y | `BACKGROUND`（編輯底圖）或 `LAYER`（編輯圖層） |
| `viewMode` | `ViewMode` | Y | `EDIT`（可編輯）或 `VIEW`（唯讀） |
| `drawingMode` | `DrawingMode` | Y | `NONE` / `RECTANGLE` / `PEN` |
| `selectedColor` | `string` | Y | 當前選中的色碼，新繪製的圖形會用這個顏色 |
| `colorPalette` | `string[]` | - | 調色盤選項，傳入後工具列會顯示色彩選擇器 |
| `onEditModeChange` | `(mode: EditMode) => void` | Y | 使用者切換底圖/圖層模式時觸發 |
| `onToggleRectangleTool` | `() => void` | Y | 使用者點擊矩形工具時觸發 |
| `onTogglePenTool` | `() => void` | Y | 使用者點擊畫筆工具時觸發 |
| `onColorChange` | `(color: string) => void` | Y | 使用者從調色盤選色時觸發 |
| `onUpload` | `(files: File[]) => Promise<string[]>` | Y | 上傳檔案，回傳 URL 陣列 |
| `onSave` | `(mapData: Map) => void` | - | 點擊儲存時觸發，回傳完整地圖資料 |
| `onNodeClick` | `(nodeInfo: WMSNodeClickInfo) => void` | - | 點擊節點時觸發 |
| `onBreadcrumbClick` | `(warehouseId: string, index: number) => void` | - | 點擊麵包屑項目時觸發 |
| `onNameChange` | `(name: string) => Promise<void>` | - | 編輯麵包屑名稱時觸發 |
| `initialNodes` | `FlowNode[]` | - | 初始節點資料（從 API 載入時使用） |
| `initialEdges` | `FlowEdge[]` | - | 初始邊資料 |
| `getFilenameFQDN` | `(filename: string) => Promise<string> \| string` | - | 將檔名轉成完整 URL（如加上 CDN 前綴） |
| `maxFileSizeKB` | `number` | - | 上傳檔案大小上限（預設 30720 = 30MB） |
| `warehouseIds` | `string[]` | - | 麵包屑顯示的庫位 ID 列表 |

---

## 模式系統

### EditMode（編輯模式）

控制哪類節點可被操作：

| 模式 | 底圖（imageNode） | 矩形（rectangleNode） | 路徑（pathNode） |
|------|:------------------:|:----------------------:|:----------------:|
| `BACKGROUND` | 可選取、拖曳、刪除 | 不可互動（半透明 0.3） | 不可互動（半透明 0.3） |
| `LAYER` | 不可互動（半透明 0.5） | 可選取、拖曳 | 可選取、拖曳、刪除 |

> 切換 `editMode` 時應同時重設 `drawingMode` 為 `NONE`。

### ViewMode（檢視模式）

| 模式 | 行為 |
|------|------|
| `EDIT` | 顯示編輯工具列，所有編輯功能啟用 |
| `VIEW` | 所有節點不可選取/拖曳/刪除，顯示「顯示底圖」開關，hover 節點會變色 |

### DrawingMode（繪圖模式）

| 模式 | 行為 |
|------|------|
| `NONE` | 選取/拖曳模式（預設） |
| `RECTANGLE` | 按住滑鼠拖曳畫矩形，最小 10×10px |
| `PEN` | 逐點點擊畫路徑，按 Enter / 雙擊 / 點回起點完成 |

---

## 工具列

### EDIT 模式工具列（畫布上方）

```
[ 圖層/底圖 切換 ] [ 上傳 | 刪除全部 ] [ 復原 | 重做 ] [ 選取 | 矩形 | 畫筆 | 調色盤 ] [ 儲存 ]
```

| 按鈕 | 顯示條件 | 說明 |
|------|----------|------|
| 圖層/底圖切換 | 永遠 | toggle 開關，切換 `editMode` |
| 上傳 | BACKGROUND 模式 | 選擇圖片上傳為底圖 |
| 刪除全部 | BACKGROUND 模式 | 清除所有底圖節點 |
| 復原 / 重做 | 永遠 | 最多 50 步歷史紀錄 |
| 選取工具 | LAYER 模式 | 游標選取/拖曳模式 |
| 矩形工具 | LAYER 模式 | 按住拖曳繪製矩形 |
| 畫筆工具 | LAYER 模式 | 逐點點擊繪製多邊形 |
| 調色盤 | LAYER 模式 + `colorPalette` 有值 | 選擇顏色套用到新圖形 |
| 儲存 | 永遠 | 呼叫 `onSave(mapData)` |

### VIEW 模式工具列（畫布左下角）

- **顯示底圖** toggle：控制底圖的顯示/隱藏（附淡入淡出動畫）

---

## 使用者互動

### 繪製矩形

1. 切到 **LAYER** 模式 → 點擊**矩形工具**
2. 在畫布上**按住滑鼠拖曳**
3. 即時顯示虛線預覽框
4. **放開滑鼠**完成建立（最小尺寸 10×10px）
5. 自動套用 `selectedColor`，預設標籤「未命名」

### 繪製路徑（多邊形）

1. 切到 **LAYER** 模式 → 點擊**畫筆工具**
2. **逐點點擊**新增控制點
3. 完成方式：
   - **點擊起始點**（≥3 點時）→ 封閉路徑
   - **雙擊** → 完成開放路徑
   - **Enter** → 完成路徑
   - **Escape** → 取消
4. 按住 **Shift** 鎖定 45° 直線

### 文字編輯（矩形 / 路徑）

- **雙擊**節點進入編輯模式
- **Enter** 儲存 / **Escape** 取消 / 點擊外部儲存

### 路徑控制點編輯

- 選取路徑節點後，白色圓點控制點出現
- 拖曳圓點可調整路徑形狀
- 封閉路徑的首尾點會同步移動

### 右鍵選單

在節點上按右鍵，選項：

| 選項 | 快捷鍵 | 說明 |
|------|--------|------|
| 複製並貼上 | `Cmd+D` | 往右下偏移 50px 複製 |
| 刪除 | - | 移除節點 |
| 移至最前 | - | z-index 設為最高 |
| 置前 | - | z-index + 1 |
| 置後 | - | z-index - 1 |
| 移至最後 | - | z-index 設為最低 |

### 鍵盤快捷鍵

| 快捷鍵 | 功能 |
|--------|------|
| `Cmd+D` | 複製選取的節點 |
| `Enter` | 完成畫筆路徑 |
| `Escape` | 取消畫筆路徑 |
| `Shift` + 點擊 | 畫筆鎖定 45° 角度 |

---

## 畫布控制

| 功能 | 操作 |
|------|------|
| 縮放 | 右下角 −/+ 按鈕，或滾輪（10%–400%） |
| 平移 | 非繪圖模式下拖曳畫布 |
| 適應畫面 | 右下角 ⛶ 按鈕，自動 fit 所有節點 |
| 空狀態 | 無節點時顯示「目前沒有資料，請上傳底圖並繪製圖層」 |

---

## 上傳流程

```
使用者選檔
  → 驗證 MIME type（僅 PNG / JPEG）+ 大小（≤ maxFileSizeKB）
  → 呼叫 onUpload(validFiles)
  → 回傳 URL 陣列
  → 逐張載入取得原始尺寸
  → 計算顯示尺寸 + 錯開位置
  → 建立 imageNode
  → 存入歷史紀錄
```

- 多張圖片會自動錯開排列在視窗中
- `getFilenameFQDN` 可將檔名轉成完整 URL（例如加上 CDN 前綴）
- 上傳期間按鈕顯示 loading 狀態

---

## 儲存輸出格式

點擊儲存時 `onSave` 收到的 `Map` 資料結構：

```ts
interface Map {
  id: string;
  backgrounds: Array<{
    id: string;
    filename: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  ranges: Array<
    | {
        // 矩形
        id: string;
        type: 'RECTANGLE';
        color: string;
        x: number;
        y: number;
        width: number;
        height: number;
      }
    | {
        // 多邊形
        id: string;
        type: 'POLYGON';
        color: string;
        points: Array<{ x: number; y: number }>;
      }
  >;
}
```

---

## 載入既有資料

使用 `transformApiDataToNodes` 將 API 回傳的 `Map` 結構轉換成 `FlowNode[]`，傳入 `initialNodes`：

```tsx
import {
  WMSMapModalContent,
  transformApiDataToNodes,
} from '@rytass/wms-map-react-components';

// 從 API 取得 mapData 後
const initialNodes = transformApiDataToNodes(mapData);

<WMSMapModalContent
  initialNodes={initialNodes}
  // ...其他 props
/>
```

元件會在 `initialNodes` 變更時自動重新載入（以節點 ID 比對差異）。

---

## 節點點擊回呼

`onNodeClick` 收到的 `WMSNodeClickInfo` 是聯合型別，依 `type` 區分：

```ts
// 底圖
interface ImageNodeClickInfo {
  type: 'imageNode';
  id: string;
  position: { x: number; y: number };
  imageData: {
    filename: string;
    size: { width: number; height: number };
    originalSize: { width: number; height: number };
    imageUrl: string;
  };
  mapBackground: MapBackground;
}

// 矩形
interface RectangleNodeClickInfo {
  type: 'rectangleNode';
  id: string;
  position: { x: number; y: number };
  rectangleData: {
    color: string;
    size: { width: number; height: number };
  };
  mapRectangleRange: MapRectangleRange;
}

// 路徑
interface PathNodeClickInfo {
  type: 'pathNode';
  id: string;
  position: { x: number; y: number };
  pathData: {
    color: string;
    strokeWidth: number;
    pointCount: number;
    points: Array<{ x: number; y: number }>;
    bounds: { minX: number; minY: number; maxX: number; maxY: number } | null;
  };
  mapPolygonRange: MapPolygonRange;
}
```

---

## WMSMapModal（Modal 版本）

如果需要彈窗形式，直接用 `WMSMapModal`，它內部自行管理 editMode / drawingMode / color 狀態：

```tsx
import { WMSMapModal, ViewMode } from '@rytass/wms-map-react-components';

<WMSMapModal
  open={isOpen}
  onClose={() => setIsOpen(false)}
  title="編輯倉儲空間"
  viewMode={ViewMode.EDIT}
  colorPalette={['#FF6B6B', '#4ECDC4', '#45B7D1']}
  onUpload={handleUpload}
  onSave={handleSave}
  warehouseIds={['A001', 'A002']}
/>
```

`WMSMapModal` 額外的 props：

| Prop | 型別 | 說明 |
|------|------|------|
| `open` | `boolean` | 控制彈窗顯示 |
| `onClose` | `() => void` | 關閉彈窗 |
| `title` | `string` | 彈窗標題（預設「編輯倉儲空間」） |
| `debugMode` | `boolean` | 開啟 debug log |

> `WMSMapModal` 不需要傳 `editMode` / `drawingMode` / `selectedColor` / 各 toggle callback，因為它自己管理。

---

## 相關常數

| 常數 | 值 | 說明 |
|------|----|------|
| `DEFAULT_RECTANGLE_COLOR` | `#3b82f6` | 未指定 colorPalette 時的預設顏色 |
| `DEFAULT_RECTANGLE_LABEL` | `未命名` | 新矩形的預設標籤 |
| `DEFAULT_PATH_LABEL` | `未命名` | 新路徑的預設標籤 |
| `MIN_RECTANGLE_SIZE` | `10` | 矩形最小邊長（px） |
| `UPLOAD_CONFIG.DEFAULT_MAX_FILE_SIZE_KB` | `30720` | 預設上傳上限 30MB |
| `CANVAS_CONFIG.MIN_ZOOM` | `0.1` | 最小縮放 10% |
| `CANVAS_CONFIG.MAX_ZOOM` | `4` | 最大縮放 400% |
| `UI_CONFIG.HISTORY_SIZE` | `50` | 最大復原步數 |
