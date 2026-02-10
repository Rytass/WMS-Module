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
};
