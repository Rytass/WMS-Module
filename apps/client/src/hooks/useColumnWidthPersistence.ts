import { useRef, useEffect, useCallback, useMemo } from 'react';
import { TableColumn, TableDataSource } from '@mezzanine-ui/react';

const STORAGE_PREFIX = 'table-col-widths:';

function getStorageKey(tableKey: string) {
  return `${STORAGE_PREFIX}${tableKey}`;
}

function loadWidths(tableKey: string): Record<string, number> | null {
  try {
    const raw = localStorage.getItem(getStorageKey(tableKey));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveWidths(tableKey: string, widths: Record<string, number>) {
  try {
    localStorage.setItem(getStorageKey(tableKey), JSON.stringify(widths));
  } catch {
    // storage full or unavailable
  }
}

export function useColumnWidthPersistence<T extends TableDataSource>(
  tableKey: string,
  columns: TableColumn<T>[],
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const savedWidths = useMemo(() => loadWidths(tableKey), [tableKey]);

  const columnsWithWidths = useMemo(
    () =>
      columns.map((col) => {
        const saved = savedWidths?.[col.key];
        return saved ? { ...col, width: saved } : col;
      }),
    [columns, savedWidths],
  );

  const readWidthsFromDOM = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const cols = container.querySelectorAll('table colgroup col');
    if (cols.length === 0) return;

    const widths: Record<string, number> = {};
    const offset = Math.max(0, cols.length - columns.length - 1);

    columns.forEach((col, i) => {
      const colEl = cols[offset + i] as HTMLElement;
      if (colEl) {
        const width = colEl.getBoundingClientRect().width;
        if (width > 0) {
          widths[col.key] = Math.round(width);
        }
      }
    });

    if (Object.keys(widths).length > 0) {
      saveWidths(tableKey, widths);
    }
  }, [columns, tableKey]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const colGroup = container.querySelector('table colgroup');
    if (!colGroup) return;

    const observer = new MutationObserver(() => {
      readWidthsFromDOM();
    });

    observer.observe(colGroup, {
      attributes: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [readWidthsFromDOM]);

  return {
    containerRef,
    columnsWithWidths,
  };
}
