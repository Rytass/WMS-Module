import { useCallback } from 'react';
import { useApolloClient, useQuery } from '@apollo/client/react';
import { useTableSort, UseTableSortResult } from '../../../hooks/useTableSort';
import {
  AggregatedStockFragment,
  AggregatedStockSortField,
  AggregatedStocksDocument,
  AggregatedStocksQuery,
} from '../../../graphql/generated/.graphql';
import { AGGREGATED_STOCK_SORT_FIELDS } from '../../../utils/columns';

/** ChooseStockTable column key → `AggregatedStockSortField`. */
const CHOOSE_STOCK_SORT_FIELDS = {
  materialKey: AGGREGATED_STOCK_SORT_FIELDS.materialKey,
  description: AGGREGATED_STOCK_SORT_FIELDS.description,
  batchKey: AGGREGATED_STOCK_SORT_FIELDS.batchKey,
  locationKey: AGGREGATED_STOCK_SORT_FIELDS.locationKey,
  status: AGGREGATED_STOCK_SORT_FIELDS.status,
  quantity: AGGREGATED_STOCK_SORT_FIELDS.quantity,
  baseUnit: AGGREGATED_STOCK_SORT_FIELDS.baseUnit,
} as const;

type ChooseStockSortKey = keyof typeof CHOOSE_STOCK_SORT_FIELDS;

/**
 * The pick list loads in one go: an operator scrolls a list, paging through
 * one is a chore on a phone. The cap only guards against a code that names a
 * whole warehouse; past it the list says how many it left out.
 */
export const CHOOSE_STOCK_LIMIT = 500;

export interface StocksByScanCode {
  readonly data: AggregatedStocksQuery | undefined;
  readonly loading: boolean;
  readonly total: number;
  readonly getColumnSortProps: UseTableSortResult<
    ChooseStockSortKey,
    AggregatedStockSortField
  >['getColumnSortProps'];
}

/** Every stock position a scanned label names (exact match, see `scanCode`). */
export function useQueryStocksByScanCode(scanCode: string): StocksByScanCode {
  const { sort, getColumnSortProps } = useTableSort({
    fields: CHOOSE_STOCK_SORT_FIELDS,
    setPage: () => undefined,
  });

  const { data, loading } = useQuery(AggregatedStocksDocument, {
    variables: {
      limit: CHOOSE_STOCK_LIMIT,
      offset: 0,
      scanCode,
      sort,
    },
    fetchPolicy: 'cache-and-network',
  });

  return {
    data,
    loading,
    total: data?.aggregatedStocks.total ?? 0,
    getColumnSortProps,
  };
}

export interface ScanLookup {
  readonly total: number;
  /** Set only when the code names exactly one stock position. */
  readonly only: AggregatedStockFragment | null;
}

/**
 * Asks how much stock a scanned code names before deciding what to show:
 * nothing (say so), one position (add it straight away) or several (let the
 * operator pick). Fetches two rows — enough to tell one from many.
 */
export function useScanLookup(): (scanCode: string) => Promise<ScanLookup> {
  const client = useApolloClient();

  return useCallback(
    async (scanCode: string): Promise<ScanLookup> => {
      const { data } = await client.query({
        query: AggregatedStocksDocument,
        variables: { scanCode, limit: 2, offset: 0 },
        fetchPolicy: 'network-only',
      });

      const total = data?.aggregatedStocks.total ?? 0;
      const items = data?.aggregatedStocks.items ?? [];

      return { total, only: total === 1 ? (items[0] ?? null) : null };
    },
    [client],
  );
}
