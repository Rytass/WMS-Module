import { RefObject, useEffect, useMemo, useRef, useState } from 'react';
import {
  Table as MznTable,
  TableColumnWithMinWidth,
  TableActionsWithMinWidth,
  TableDataSource,
  TableProps,
} from '@mezzanine-ui/react';
import {
  EXPANSION_COLUMN_WIDTH,
  SELECTION_COLUMN_WIDTH,
  TABLE_ACTIONS_KEY,
} from '@mezzanine-ui/core/table';
import { usePersistedColumnWidths } from '../../../hooks/usePersistedColumnWidths';
import { useCompactLayout } from '../../../hooks/useCompactLayout';

const COLUMN_MIN_WIDTH = 40;

/** Width a column gets when its definition does not name one. */
const DEFAULT_COLUMN_WIDTH = 160;

/**
 * Room kept free to the right of the last data column.
 *
 * Mezzanine's resize handle takes the width a column grows by from the
 * table's *last* column first and only then from the neighbour. Our last
 * column is the actions column, which used to be a flex column: once the
 * data columns filled the container it sat at its 40px minimum, had nothing
 * to give, and every drag ate the neighbour instead. Keeping it at least
 * this wide gives a drag somewhere to go; since its width is never
 * persisted, it is back to full size after every drag, and the table
 * scrolls horizontally instead.
 */
const RESIZE_RESERVE_WIDTH = 200;

const TRANSIENT_WIDTH_KEYS = [TABLE_ACTIONS_KEY] as const;

function useElementWidth(): [RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return [ref, width];
}

const Table = <T extends TableDataSource>({
  tableKey,
  pinnedUntilColumnKey,
  pinnedColumnKeys,
  unpaginated = false,
  ...props
}: TableProps<T> & {
  tableKey: string;
  /**
   * Render every row with no pager. The wrapper otherwise always hands
   * Mezzanine a pagination object, which draws a pager even without
   * `total` / `current`.
   */
  unpaginated?: boolean;
  /**
   * Pin every data column up to and including this one to the start edge
   * while the table scrolls horizontally.
   */
  pinnedUntilColumnKey?: string;
  /**
   * Pin exactly these data columns. For a table whose columns before the
   * material key are too wide to pin as one block; the pinned set may skip
   * columns.
   */
  pinnedColumnKeys?: readonly string[];
}) => {
  const [containerRef, containerWidth] = useElementWidth();
  const compact = useCompactLayout();

  const { columnWidths, onColumnWidthsChange } = usePersistedColumnWidths(
    tableKey,
    TRANSIENT_WIDTH_KEYS,
  );

  const pinnedUntilIndex = useMemo(
    (): number =>
      pinnedUntilColumnKey
        ? props.columns.findIndex((c) => c.key === pinnedUntilColumnKey)
        : -1,
    [pinnedUntilColumnKey, props.columns],
  );

  /*
   * Every data column gets an explicit width. Pinned offsets are computed
   * from `column.width`, and an implicit flex column would also compete with
   * the actions column for the free space this wrapper keeps on the right.
   */
  const columns = useMemo(
    (): TableColumnWithMinWidth<T>[] =>
      props.columns.map((c, index) => ({
        ...c,
        width: c.width ?? DEFAULT_COLUMN_WIDTH,
        minWidth: COLUMN_MIN_WIDTH,
        // On a phone the pinned block alone is wider than the screen, and
        // pinned columns never scroll: whatever lies past them (the material
        // key, on the inventory list) could not be reached at all.
        fixed:
          !compact &&
          (index <= pinnedUntilIndex || pinnedColumnKeys?.includes(c.key))
            ? 'start'
            : c.fixed,
      })),
    [compact, pinnedColumnKeys, pinnedUntilIndex, props.columns],
  );

  const leadingControlsWidth =
    (props.rowSelection ? SELECTION_COLUMN_WIDTH : 0) +
    (props.expandable ? EXPANSION_COLUMN_WIDTH : 0);

  const dataColumnsWidth = columns.reduce(
    (sum, c) => sum + (columnWidths[c.key] ?? c.width ?? 0),
    0,
  );

  /*
   * While the free space is at least the reserve, the actions column stays a
   * flex column and fills it exactly. Below that it gets the reserve as an
   * explicit width, which pushes the table past the container.
   */
  const needsReserve =
    containerWidth > 0 &&
    containerWidth - leadingControlsWidth - dataColumnsWidth <
      RESIZE_RESERVE_WIDTH;

  const actions = useMemo(
    (): TableActionsWithMinWidth<T> => ({
      ...props.actions,
      render: props.actions?.render ?? (() => []),
      minWidth: COLUMN_MIN_WIDTH,
      width: needsReserve ? RESIZE_RESERVE_WIDTH : undefined,
    }),
    [needsReserve, props.actions],
  );

  return (
    <div ref={containerRef}>
      <MznTable<T>
        {...props}
        columns={columns}
        actions={actions}
        fullWidth
        resizable
        columnWidths={columnWidths}
        onColumnWidthsChange={onColumnWidthsChange}
        /*
         * Caller-first. This used to be a hard-coded `{ title: '查無資料' }`
         * placed after the spread, which silently swallowed every caller's
         * `emptyProps` — the inventory list could not tell "you have not
         * searched yet" apart from "your search matched nothing", which the
         * design treats as two different screens.
         */
        emptyProps={{
          title: '查無資料',
          ...props.emptyProps,
        }}
        pagination={
          unpaginated
            ? undefined
            : {
                showPageSizeOptions: true,
                pageSizeLabel: '每頁顯示：',
                pageSizeOptions: [5, 10, 15, 20],
                ...props.pagination,
                // A full pager (size picker, five page numbers, both ends)
                // is wider than a phone and pushed the page sideways.
                ...(compact
                  ? {
                      showPageSizeOptions: false,
                      siblingCount: 0,
                      boundaryCount: 1,
                    }
                  : {}),
              }
        }
      />
    </div>
  );
};

export default Table;
