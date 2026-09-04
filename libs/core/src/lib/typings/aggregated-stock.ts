import { type StockEntityClass } from '../models';
import { ChangeType } from '../constants/stock-status';

export type AggregatedStock = Pick<
  StockEntityClass,
  'materialId' | 'batchId' | 'locationId' | 'loaderId' | 'status' | 'quantity'
> & {
  transferId?: string | null;
  held?: boolean;
  inShipment?: boolean;
  saleId?: string | null;
  saleSerialId?: string | null;
  customerId?: string | null;
  vendorId?: string | null;
  inspectionResult?: boolean;
  /** Whether anyone actually asked for this batch to be inspected. */
  requiresInspection?: boolean;
  /** The batch this one was split out of; `null` for a batch created outright. */
  parentBatchId?: string | null;
  /** The host's own attributes on the batch, stored verbatim. */
  attributes?: Record<string, unknown> | null;
};

export interface ValidateStockDeductionParams {
  materialId: string;
  batchId: string;
  locationId?: string;
  loaderId: string;
  quantity: number;
}

export type ChangeLog = Pick<
  StockEntityClass,
  'id' | 'materialId' | 'batchId' | 'locationId' | 'loaderId' | 'quantity'
> & {
  changeType: ChangeType;
};
