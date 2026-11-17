import { useState, useCallback } from 'react';
import { SortOrder } from '@mezzanine-ui/react';

/**
 * @deprecated Client-side sort state with no server wiring. Use
 * `useTableSort`, which maps columns to a list's `<List>SortField`, produces
 * the query's `sort` variable and resets the page.
 */
export function useSortTable() {
  const [sortOrder, setSortOrder] = useState<{
    key: string;
    sortOrder: SortOrder;
  } | null>(null);

  const getCurrentSortOrder = useCallback(
    (key: string) =>
      sortOrder?.key === key ? sortOrder?.sortOrder : undefined,
    [sortOrder?.key, sortOrder?.sortOrder],
  );

  const onSort = useCallback((key: string, order: SortOrder) => {
    setSortOrder({ key, sortOrder: order });
  }, []);

  return {
    sortOrder,
    setSortOrder,
    getCurrentSortOrder,
    onSort,
  };
}
