import { StockStatus } from '../constants';
import { PaginationInput } from './paginations';

export type FindStockInput<U extends object> = PaginationInput & {
  materialId?: string;
  batchId?: string;
  locationId?: string;
  /**
   * Locations to leave out of the result, whatever else matches.
   *
   * `locationId` narrows to one place; this widens from "everywhere" by
   * subtraction, which is what a stock report needs when some locations do not
   * represent available inventory — a staging lane, a quarantine bay, a
   * work-in-progress location a host issues material into. The module has no
   * opinion on what those locations mean, so it takes ids rather than a
   * classification: the host already knows which of its locations to leave out,
   * and it can change that answer without a schema migration.
   *
   * An empty array is treated as "not filtering", the same as omitting it.
   */
  excludeLocationIds?: string[];
  loaderId?: string;
  description?: string;
  wildcard?: {
    key: keyof U;
    value: string;
  };
  status?: StockStatus;
  negateStatus?: StockStatus;
  /**
   * @deprecated Ignored, and slated for removal in the next minor.
   *
   * Every method that reads this input already fixes its own aggregation:
   * `findAggregatedStocks` and `findAggregatedStock` always aggregate,
   * `findMany` and `findChangeLogs` never do. Passing `false` to an
   * `findAggregated*` call used to produce a SQL error rather than un-aggregated
   * rows, which is how we know nobody was relying on it.
   */
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
