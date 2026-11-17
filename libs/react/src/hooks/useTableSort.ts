import { useCallback, useMemo, useState } from 'react';
import type { SortOrder as ColumnSortOrder } from '@mezzanine-ui/react';
import { SortOrder } from '../graphql/generated/.graphql';

/** What a list query's `sort` argument takes: `<List>SortInput`. */
export interface TableSort<F extends string> {
  field: F;
  order: SortOrder;
}

/** Spread onto a Mezzanine `TableColumn` to make it sortable. */
export interface TableColumnSortProps {
  onSort: (key: string, order: ColumnSortOrder) => void;
  sortOrder: ColumnSortOrder;
}

export interface UseTableSortOptions<K extends string, F extends string> {
  /**
   * Column key → the list's GraphQL `<List>SortField`. Only these columns are
   * sortable; it is the frontend half of the backend whitelist.
   */
  fields: Readonly<Record<K, F>>;
  /**
   * Called with `1` whenever the sort changes, in the same event as the state
   * update so the query runs once, on the first page. Pass the table's
   * `setPage` from `useTablePageState`.
   */
  setPage: (page: number) => void;
}

export interface UseTableSortResult<K extends string, F extends string> {
  /** Ready for the query variables; `undefined` = server default order. */
  sort: TableSort<F> | undefined;
  getColumnSortProps: (key: K) => TableColumnSortProps;
  resetSort: () => void;
}

const TO_SORT_ORDER: Readonly<
  Record<Exclude<ColumnSortOrder, null>, SortOrder>
> = {
  ascend: SortOrder.ASC,
  descend: SortOrder.DESC,
};

/**
 * Server-side column sorting for a Mezzanine `Table`.
 *
 * State lives in the component only (not the URL). Mezzanine cycles a column
 * header through ascend → descend → null; `null` clears the sort and the list
 * falls back to its server default. Only one column sorts at a time.
 *
 * ```tsx
 * const { sort, getColumnSortProps } = useTableSort({
 *   fields: { key: MaterialSortField.KEY },
 *   setPage,
 * });
 * useQuery(MaterialsDocument, { variables: { offset, limit, sort } });
 * const columns = [{ key: 'key', title: '料號', ...getColumnSortProps('key') }];
 * ```
 */
export function useTableSort<K extends string, F extends string>({
  fields,
  setPage,
}: UseTableSortOptions<K, F>): UseTableSortResult<K, F> {
  const [state, setState] = useState<{
    key: K;
    order: Exclude<ColumnSortOrder, null>;
  } | null>(null);

  const sort = useMemo(
    (): TableSort<F> | undefined =>
      state
        ? { field: fields[state.key], order: TO_SORT_ORDER[state.order] }
        : undefined,
    [fields, state],
  );

  const onSort = useCallback(
    (key: string, order: ColumnSortOrder): void => {
      setState(order ? { key: key as K, order } : null);
      setPage(1);
    },
    [setPage],
  );

  const getColumnSortProps = useCallback(
    (key: K): TableColumnSortProps => ({
      onSort,
      sortOrder: state?.key === key ? state.order : null,
    }),
    [onSort, state],
  );

  const resetSort = useCallback((): void => {
    setState(null);
    setPage(1);
  }, [setPage]);

  return { sort, getColumnSortProps, resetSort };
}
