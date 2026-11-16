import { useCallback, useState } from 'react';

/*
 * Same key and value shape as `useColumnWidthPersistence`, so widths a user
 * already dragged survive the switch to the controlled API.
 */
const STORAGE_PREFIX = 'table-col-widths:';

function loadWidths(tableKey: string): Record<string, number> {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${tableKey}`);
    const parsed: unknown = raw ? JSON.parse(raw) : null;

    if (!parsed || typeof parsed !== 'object') return {};

    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, number] =>
          typeof entry[1] === 'number' && Number.isFinite(entry[1]),
      ),
    );
  } catch {
    return {};
  }
}

function saveWidths(tableKey: string, widths: Record<string, number>): void {
  try {
    localStorage.setItem(
      `${STORAGE_PREFIX}${tableKey}`,
      JSON.stringify(widths),
    );
  } catch {
    // storage full or unavailable
  }
}

export interface PersistedColumnWidths {
  columnWidths: Record<string, number>;
  onColumnWidthsChange: (widths: Record<string, number>) => void;
}

/**
 * Controlled column widths for a resizable Mezzanine `Table`, persisted to
 * localStorage under `tableKey`.
 *
 * `transientKeys` are dropped before the widths are stored or fed back: a
 * column listed there always falls back to its declared `width`. The table
 * wrapper uses it for the trailing actions column, which a drag shrinks as
 * the donor and which must come back after every drag.
 */
export function usePersistedColumnWidths(
  tableKey: string,
  transientKeys: readonly string[] = [],
): PersistedColumnWidths {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
    () => loadWidths(tableKey),
  );

  const onColumnWidthsChange = useCallback(
    (widths: Record<string, number>): void => {
      const next = Object.fromEntries(
        Object.entries(widths)
          .filter(([key]) => !transientKeys.includes(key))
          .map(([key, width]) => [key, Math.round(width)]),
      );

      setColumnWidths(next);
      saveWidths(tableKey, next);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tableKey, transientKeys.join('\n')],
  );

  return { columnWidths, onColumnWidthsChange };
}
