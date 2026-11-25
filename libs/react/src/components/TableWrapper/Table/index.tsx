import { useMemo } from 'react';
import {
  Table as MznTable,
  TableColumnWithMinWidth,
  TableActionsWithMinWidth,
  TableDataSource,
  TableProps,
} from '@mezzanine-ui/react';
import { TABLE_ACTIONS_KEY } from '@mezzanine-ui/core/table';
import { usePersistedColumnWidths } from '../../../hooks/usePersistedColumnWidths';
import { useCompactLayout } from '../../../hooks/useCompactLayout';

const COLUMN_MIN_WIDTH = 40;

/** Width a column gets when its definition does not name one. */
const DEFAULT_COLUMN_WIDTH = 160;

const TRANSIENT_WIDTH_KEYS = [TABLE_ACTIONS_KEY] as const;

const Table = <T extends TableDataSource>({
  tableKey,
  pinnedUntilColumnKey,
  pinnedColumnKeys,
  unpaginated = false,
  fullWidth = true,
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
  /**
   * Stretch the table to its container (default). Pass `false` for a table
   * that should be exactly as wide as its columns.
   */
  fullWidth?: boolean;
}) => {
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
   * from `column.width`, and under `grow-table` an implicit flex column would
   * be the one that absorbs a drag instead of the table growing.
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

  const actions = useMemo(
    (): TableActionsWithMinWidth<T> | undefined =>
      props.actions
        ? { ...props.actions, minWidth: COLUMN_MIN_WIDTH }
        : undefined,
    [props.actions],
  );

  return (
    <MznTable<T>
      {...props}
      columns={columns}
      actions={actions}
      fullWidth={fullWidth}
      resizable
      /*
       * A drag changes only the dragged column; the table widens and
       * scrolls horizontally instead of taking the width from the last
       * column or the neighbour (#180).
       */
      resizeStrategy="grow-table"
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
  );
};

export default Table;
