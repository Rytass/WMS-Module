import { type StockEntityClass } from '../models';

export type AggregatedStock = Pick<
  StockEntityClass,
  'materialId' | 'batchId' | 'locationId' | 'loaderId' | 'status' | 'quantity'
> & {
  saleId?: string | null;
  saleSerialId?: string | null;
  customerId?: string | null;
  vendorId?: string | null;
  inspectionId?: string | null;
};

export type ChangeLog = Pick<
  StockEntityClass,
  | 'id'
  | 'materialId'
  | 'batchId'
  | 'locationId'
  | 'loaderId'
  | 'status'
  | 'quantity'
>;
