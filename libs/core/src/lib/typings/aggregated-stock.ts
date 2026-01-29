import { type StockEntityClass } from '../models';

export type AggregatedStock = Pick<
  StockEntityClass,
  'materialId' | 'batchId' | 'locationId' | 'loaderId' | 'status' | 'quantity'
>;
