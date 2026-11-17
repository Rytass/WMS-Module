import { PaginationInput } from './paginations';
import { ListSort } from './list-sort';

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
 * `quantity` is in the line's own unit, the same as `targetConsumedQuantity`,
 * and is converted to base units before it is compared with anything. Omitting
 * it means "whatever is outstanding on that line", which is what makes the
 * common case — issue the whole order, settle everything still out there — a
 * call with no line list at all.
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

/**
 * Columns `ConsumptionOrderService.findMany` can sort by. Values are part of
 * the public GraphQL schema (`ConsumptionOrderSortField`): add freely, never
 * rename or remove. Item-derived columns (sources, targets, item count,
 * issued/outstanding/settled totals) are left out: they aggregate many lines
 * and have no column to order by.
 */
export enum ConsumptionOrderSortField {
  KEY = 'KEY',
  DESCRIPTION = 'DESCRIPTION',
  CREATED_AT = 'CREATED_AT',
}

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
  /** Omitted: newest first (`createdAt DESC`), then `id`. */
  sort?: ListSort<ConsumptionOrderSortField> | null;
};

/**
 * How much of one line has moved, **in base units** — the unit the stock ledger
 * and `quantityChanged` are written in, not the unit the line was ordered in.
 *
 * `target` is therefore `targetConsumedQuantity` already multiplied by the
 * line's conversion factor, so every field here can be compared with every
 * other. Reporting the target in the line's own unit next to totals in base
 * units is what made a whole-order settle ask for twelve times what was there.
 */
export type ConsumptionOrderItemProgress = {
  itemId: string;
  /** `targetConsumedQuantity` converted to base units. */
  target: number;
  issued: number;
  returned: number;
  settled: number;
  /** Issued minus returned minus settled: what the process still holds. */
  outstanding: number;
};
