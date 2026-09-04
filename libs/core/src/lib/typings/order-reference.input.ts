import { WmsOrderType } from '../constants/order-type';
import { PaginationInput } from './paginations';

/** One link from an order to a document in the host system. */
export type OrderReferenceInput = {
  /** Host-defined kind of document, e.g. `work-order`, `purchase-order`. */
  referenceType: string;
  /** The document's identifier, as the host knows it. */
  referenceId: string;
  /** The line within that document, when it has lines. */
  referenceLine?: string | null;
  /** The order item this link is about; omit for an order-level link. */
  itemId?: string | null;
  /** Anything else worth carrying along. Stored verbatim, never interpreted. */
  metadata?: Record<string, unknown> | null;
};

export type AttachOrderReferencesInput = {
  orderType: WmsOrderType;
  orderId: string;
  references: OrderReferenceInput[];
};

export type FindOrderReferenceInput = PaginationInput & {
  orderType?: WmsOrderType;
  orderId?: string;
  itemId?: string;
  referenceType?: string;
  referenceId?: string;
  referenceLine?: string;
};
