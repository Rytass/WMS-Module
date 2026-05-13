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

    const colGroup = container.querySelector('table colgroup');
    if (!colGroup) return;

    const cols = colGroup.querySelectorAll('col');
    const widths: Record<string, number> = {};

    // col elements correspond to: [selection?] [expansion?] [draggable?] ...columns [actions?]
    // We match by counting from the end since action columns are predictable
    // Simpler: use data attributes or match by index
    const headerCells = container.querySelectorAll(
      'thead tr th[data-column-key]',
    );

    if (headerCells.length > 0) {
      headerCells.forEach((th) => {
        const key = th.getAttribute('data-column-key');
        if (key) {
          const width = th.getBoundingClientRect().width;
          if (width > 0) {
            widths[key] = Math.round(width);
          }
        }
      });
    } else {
      // Fallback: match col elements to columns by index offset
      // Find the offset by checking how many extra cols exist
      const extraCols = cols.length - columns.length;
      const offset = Math.max(0, extraCols > 1 ? extraCols - 1 : extraCols);

      columns.forEach((col, i) => {
        const colEl = cols[offset + i];
        if (colEl) {
          const width = colEl.getBoundingClientRect().width;
          if (width > 0) {
            widths[col.key] = Math.round(width);
          }
        }
      });
    }

    if (Object.keys(widths).length > 0) {
      saveWidths(tableKey, widths);
    }
  }, [columns, tableKey]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new MutationObserver(() => {
      readWidthsFromDOM();
    });

    const colGroup = container.querySelector('table colgroup');
    if (colGroup) {
      observer.observe(colGroup, {
        attributes: true,
        attributeFilter: ['style'],
        subtree: true,
      });
    }

    return () => observer.disconnect();
  }, [readWidthsFromDOM]);

  return {
    containerRef,
    columnsWithWidths,
  };
}
