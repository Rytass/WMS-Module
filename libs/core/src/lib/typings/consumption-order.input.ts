import { PaginationInput } from './paginations';

export type CreateConsumptionOrderItemInput = {
  materialId: string;
  batchId: string;
  /** Where the material is issued from. Defaults to the module's default location. */
  locationId?: string;
  loaderId?: string;
  unitId?: string;
  quantity: number;
  /** Where it sits while the process holds it. Defaults to the source location. */
  targetLocationId?: string;
  targetLoaderId?: string;
};

export type CreateConsumptionOrderInput = {
  description?: string;
  createdBy?: string;
  items: CreateConsumptionOrderItemInput[];
};

export type UpdateConsumptionOrderInput = {
  id: string;
  description?: string;
  items?: CreateConsumptionOrderItemInput[];
};

/**
 * One line of an issue / return / settle call.
 *
 * `quantity` is in the item's own unit, the same as `targetConsumedQuantity`;
 * omitting it means "whatever is outstanding on that line", which is what makes
 * the common case — issue the whole order, settle everything still out there —
 * a call with no line list at all.
 */
export type ConsumptionOrderLineInput = {
  itemId: string;
  quantity?: number;
};

export type ConsumptionOrderActionInput = {
  orderId: string;
  /** Omit to act on every line of the order. */
  items?: ConsumptionOrderLineInput[];
};

export type FindConsumptionOrderInput = PaginationInput & {
  ids?: string[];
  key?: string;
  description?: string;
  materialId?: string;
  batchId?: string;
  locationId?: string;
  createdBy?: string;
  createdAtFrom?: Date;
  createdAtTo?: Date;
  includeRemoved?: boolean;
};

/** How much of one line has moved, in the item's own unit. */
export type ConsumptionOrderItemProgress = {
  itemId: string;
  /** `targetConsumedQuantity`. */
  target: number;
  issued: number;
  returned: number;
  settled: number;
  /** Issued minus returned minus settled: what the process still holds. */
  outstanding: number;
};
