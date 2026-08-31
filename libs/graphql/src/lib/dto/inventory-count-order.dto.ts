import {
  Field,
  Float,
  ID,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import { InventoryCountStatus } from '@rytass/wms-module-core';
import { PaginatedResponse } from './pagination.dto';

registerEnumType(InventoryCountStatus, {
  name: 'InventoryCountStatus',
  description:
    'Lifecycle of an inventory count: PENDING (尚未執行) → COUNTING (盤點中) → COMPLETED (已完成), or CANCELLED (已取消).',
});

/**
 * A count-sheet line.
 *
 * `material` / `batch` / `location` / `loader` are deliberately absent from this
 * class: they are added to the schema by `InventoryCountOrderItemResolver` as
 * `@ResolveField`s so they load through DataLoaders, and declaring them here
 * would make the class stop matching the entity the service returns.
 */
@ObjectType()
export class InventoryCountOrderItemDto {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  orderId!: string;

  @Field(() => ID)
  materialId!: string;

  @Field(() => ID)
  batchId!: string;

  @Field(() => ID, { nullable: true })
  locationId!: string | null;

  @Field(() => ID, { nullable: true })
  loaderId!: string | null;

  @Field(() => ID, { nullable: true })
  unitId!: string | null;

  /** Ledger quantity in base units, frozen when counting started. */
  @Field(() => Float)
  bookQuantity!: number;

  /** What was found, expressed in `unitId`. `null` until someone counts it. */
  @Field(() => Float, { nullable: true })
  countedQuantity!: number | null;

  /** `true` for a line added during counting for stock the books never had. */
  @Field(() => Boolean)
  isAddition!: boolean;

  // ── Batch attributes as they were when counting started ────────────────── //
  //
  // Snapshotted rather than resolved live: the batch keeps moving after a count
  // settles, and a sheet that silently rewrites itself months later stops being
  // a record of what was found. `null` before counting has started.

  @Field(() => Boolean, { nullable: true })
  held!: boolean | null;

  @Field(() => Boolean, { nullable: true })
  inShipment!: boolean | null;

  /** `null` = awaiting inspection, `false` = failed, `true` = passed. */
  @Field(() => Boolean, { nullable: true })
  inspectionResult!: boolean | null;

  @Field(() => ID, { nullable: true })
  transferId!: string | null;

  @Field(() => String, { nullable: true })
  vendorId!: string | null;

  @Field(() => String, { nullable: true })
  customerId!: string | null;

  @Field(() => String, { nullable: true })
  saleId!: string | null;

  @Field(() => String, { nullable: true })
  saleSerialId!: string | null;
}

/**
 * A count order. `items` and `locations` come from
 * `InventoryCountOrderResolver`, for the same reason as above; `locations`
 * exposes the roots the user picked, not the expanded subtree.
 */
@ObjectType()
export class InventoryCountOrderDto {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  key!: string;

  @Field(() => String)
  name!: string;

  /**
   * The count's base date. Stock adjustments from settlement are reported under
   * this date rather than the day settlement happened to run.
   */
  @Field(() => String)
  countDate!: string;

  @Field(() => InventoryCountStatus)
  status!: InventoryCountStatus;

  @Field(() => String, { nullable: true })
  createdBy!: string | null;

  @Field(() => Date, { nullable: true })
  startedAt!: Date | null;

  @Field(() => Date, { nullable: true })
  settledAt!: Date | null;

  @Field(() => Date, { nullable: true })
  cancelledAt!: Date | null;

  @Field(() => Date)
  createdAt!: Date;
}

@ObjectType()
export class InventoryCountOrderItems extends PaginatedResponse(
  InventoryCountOrderItemDto,
) {}

@ObjectType()
export class InventoryCountOrders extends PaginatedResponse(
  InventoryCountOrderDto,
) {}
