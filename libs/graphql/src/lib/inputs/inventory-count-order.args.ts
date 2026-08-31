import { ArgsType, Field, Float, ID, InputType } from '@nestjs/graphql';
import { InventoryCountStatus } from '@rytass/wms-module-core';
import { PaginationArgs } from './pagination.args';

@ArgsType()
export class FindInventoryCountOrderArgs extends PaginationArgs {
  @Field(() => String, { nullable: true })
  name?: string;

  @Field(() => [InventoryCountStatus], { nullable: true })
  statuses?: InventoryCountStatus[];

  @Field(() => String, { nullable: true })
  createdBy?: string;

  /** Inclusive lower bound on `countDate`, `YYYY-MM-DD`. */
  @Field(() => String, { nullable: true })
  countDateFrom?: string;

  /** Inclusive upper bound on `countDate`, `YYYY-MM-DD`. */
  @Field(() => String, { nullable: true })
  countDateTo?: string;

  /**
   * Matches against the expanded scope, not the roots the user picked, so
   * filtering by a shelf finds the count that covers its whole aisle.
   */
  @Field(() => [ID], { nullable: true })
  locationIds?: string[];
}

@ArgsType()
export class CreateInventoryCountOrderArgs {
  @Field(() => String)
  name!: string;

  @Field(() => String)
  countDate!: string;

  /** Root locations; every descendant is pulled into scope automatically. */
  @Field(() => [ID])
  locationIds!: string[];
}

@ArgsType()
export class UpdateInventoryCountOrderArgs {
  @Field(() => ID)
  id!: string;

  @Field(() => String, { nullable: true })
  name?: string;

  @Field(() => String, { nullable: true })
  countDate?: string;

  @Field(() => [ID], { nullable: true })
  locationIds?: string[];
}

@InputType()
export class CountInventoryItemInput {
  @Field(() => ID)
  itemId!: string;

  /** `null` clears the entry, putting the line back to "not counted". */
  @Field(() => Float, { nullable: true })
  countedQuantity?: number | null;

  @Field(() => ID, { nullable: true })
  unitId?: string | null;
}

@ArgsType()
export class CountInventoryArgs {
  @Field(() => ID)
  id!: string;

  @Field(() => [CountInventoryItemInput])
  items!: CountInventoryItemInput[];
}

@ArgsType()
export class AddInventoryCountItemArgs {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  materialId!: string;

  /** An existing batch key, or a new one — the batch is created on demand. */
  @Field(() => String)
  batchKey!: string;

  @Field(() => ID)
  locationId!: string;

  @Field(() => ID, { nullable: true })
  loaderId?: string | null;

  @Field(() => Float)
  countedQuantity!: number;

  @Field(() => ID, { nullable: true })
  unitId?: string | null;
}

@ArgsType()
export class RemoveInventoryCountItemArgs {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  itemId!: string;
}

@ArgsType()
export class InventoryCountOrderIdArgs {
  @Field(() => ID)
  id!: string;
}
