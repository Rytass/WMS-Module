import { StockStatus } from '../constants';
import { PaginationInput } from './paginations';

export type FindStockInput<U extends object> = PaginationInput & {
  materialId?: string;
  batchId?: string;
  locationId?: string;
  loaderId?: string;
  description?: string;
  wildcard?: {
    key: keyof U;
    value: string;
  };
  status?: StockStatus;
  negateStatus?: StockStatus;
  aggregated?: boolean;
  aggregatedKeys?: string[];

  materialKey?: string;
  batchKey?: string;
  locationKey?: string;
  loaderKey?: string;

  /**
   * Commercial attributes of the stock's batch.
   *
   * They live on the batch table, not on stock, which is why they need their own
   * join rather than a plain `andWhere` — the same four columns the aggregated
   * projection already selects (`vendorId` / `customerId` / `saleId` /
   * `saleSerialId`), so filtering and displaying stay in step.
   *
   * `null` is accepted and treated as "not filtering": the aggregated-stock
   * lookups pass a whole `AggregatedStock` through here, and those columns are
   * nullable on the batch.
   */
  vendorId?: string | null;
  customerId?: string | null;
  saleId?: string | null;
  saleSerialId?: string | null;
};
