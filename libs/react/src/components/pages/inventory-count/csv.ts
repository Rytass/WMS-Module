import type { InventoryCountOrderItemFragment } from '../../../graphql/generated/.graphql';

/**
 * The count sheet exchange format.
 *
 * CSV rather than XLSX on purpose: `libs/react` carries no spreadsheet
 * dependency, and adding one would mean a new peer dependency plus a matching
 * entry in `rollup.config.mjs`'s `externalPatterns`. Producing and parsing CSV
 * costs a few dozen lines and no dependency at all. If XLSX is ever needed it
 * can arrive as an optional peer dep behind a dynamic import without disturbing
 * existing consumers.
 */
export const COUNT_SHEET_HEADERS = [
  '盤點單號',
  '項目識別碼',
  '料號',
  '物料說明',
  '批號',
  '儲存位置',
  '載具',
  '帳面數量',
  '單位',
  '盤點數量',
] as const;

/** Excel only recognises UTF-8 CSV when it starts with a BOM. */
const BOM = '\uFEFF';

function escapeCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function buildCountSheetCsv(
  orderKey: string,
  items: readonly InventoryCountOrderItemFragment[],
): string {
  const rows = items.map((item) =>
    [
      orderKey,
      item.id,
      item.material?.key ?? '',
      item.material?.description ?? '',
      item.batch?.key ?? '',
      item.location?.key ?? '',
      item.loader?.serialId ?? '',
      String(item.bookQuantity),
      item.unitId ?? '',
      // Left blank on purpose: this column is what the floor fills in.
      '',
    ]
      .map((cell) => escapeCell(String(cell)))
      .join(','),
  );

  return [BOM + COUNT_SHEET_HEADERS.join(','), ...rows].join('\r\n');
}

/** One parsed upload row, already matched against the sheet. */
export interface ParsedCountRow {
  readonly itemId: string;
  readonly countedQuantity: number;
}

export interface ParsedCountSheet {
  readonly rows: readonly ParsedCountRow[];
  /** Human-readable problems, one per offending line, for a single summary. */
  readonly errors: readonly string[];
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (quoted) {
      if (char === '"' && line[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }

      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      cells.push(cell);
      cell = '';
    } else {
      cell += char;
    }
  }

  cells.push(cell);

  return cells;
}

/**
 * Match an uploaded sheet back onto the order's lines.
 *
 * The item id is the primary key because it survives any amount of editing in
 * Excel. When it has been mangled or removed, the natural key — 料號 + 批號 +
 * 儲存位置 + 載具 — is tried instead, which is what makes a sheet printed,
 * written on and retyped still usable.
 *
 * Rows are validated independently and every problem is collected: a single bad
 * line must not cost the operator the other two hundred.
 */
export function parseCountSheetCsv(
  content: string,
  items: readonly InventoryCountOrderItemFragment[],
): ParsedCountSheet {
  const lines = content
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    return { rows: [], errors: ['檔案沒有任何資料列'] };
  }

  const header = splitCsvLine(lines[0]).map((cell) => cell.trim());
  const columnOf = (name: string): number => header.indexOf(name);

  const idColumn = columnOf('項目識別碼');
  const quantityColumn = columnOf('盤點數量');

  if (quantityColumn === -1) {
    return { rows: [], errors: ['找不到「盤點數量」欄位'] };
  }

  const naturalKeyColumns = {
    material: columnOf('料號'),
    batch: columnOf('批號'),
    location: columnOf('儲存位置'),
    loader: columnOf('載具'),
  };

  const byId = new Map(items.map((item) => [item.id, item] as const));
  const byNaturalKey = new Map(
    items.map(
      (item) =>
        [
          [
            item.material?.key ?? '',
            item.batch?.key ?? '',
            item.location?.key ?? '',
            item.loader?.serialId ?? '',
          ].join('|'),
          item,
        ] as const,
    ),
  );

  const rows: ParsedCountRow[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  lines.slice(1).forEach((line, index) => {
    const lineNumber = index + 2;
    const cells = splitCsvLine(line);
    const rawQuantity = (cells[quantityColumn] ?? '').trim();

    if (!rawQuantity) {
      // A blank count is "not counted yet", not an error.
      return;
    }

    const quantity = Number(rawQuantity);

    if (!Number.isFinite(quantity) || quantity < 0) {
      errors.push(
        `第 ${lineNumber} 列：盤點數量「${rawQuantity}」不是有效數字`,
      );

      return;
    }

    const id = idColumn === -1 ? '' : (cells[idColumn] ?? '').trim();
    let item = id ? byId.get(id) : undefined;

    if (!item) {
      const naturalKey = [
        naturalKeyColumns.material,
        naturalKeyColumns.batch,
        naturalKeyColumns.location,
        naturalKeyColumns.loader,
      ]
        .map((column) => (column === -1 ? '' : (cells[column] ?? '').trim()))
        .join('|');

      item = byNaturalKey.get(naturalKey);
    }

    if (!item) {
      errors.push(`第 ${lineNumber} 列：找不到對應的盤點項目`);

      return;
    }

    if (seen.has(item.id)) {
      errors.push(`第 ${lineNumber} 列：同一個盤點項目重複出現`);

      return;
    }

    seen.add(item.id);
    rows.push({ itemId: item.id, countedQuantity: quantity });
  });

  return { rows, errors };
}

/** Hand the browser a generated file. */
export function downloadCsv(filename: string, content: string): void {
  const url = URL.createObjectURL(
    new Blob([content], { type: 'text/csv;charset=utf-8;' }),
  );
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
}
