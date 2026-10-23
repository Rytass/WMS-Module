import { ArgsType, Field, Float, ID, InputType } from '@nestjs/graphql';
import { PaginationArgs } from './pagination.args';

@InputType()
export class CreateConsumptionOrderItemInputType {
  @Field(() => ID)
  materialId!: string;

  @Field(() => ID)
  batchId!: string;

  /** Where the material is issued from. Defaults to the module's default location. */
  @Field(() => ID, { nullable: true })
  locationId?: string;

  @Field(() => ID, { nullable: true })
  loaderId?: string;

  @Field(() => ID, { nullable: true })
  unitId?: string;

  @Field(() => Float)
  quantity!: number;

  /** Where it sits while the process holds it. Defaults to the source location. */
  @Field(() => ID, { nullable: true })
  targetLocationId?: string;

  @Field(() => ID, { nullable: true })
  targetLoaderId?: string;
}

@ArgsType()
export class CreateConsumptionOrderArgs {
  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  createdBy?: string;

  @Field(() => [CreateConsumptionOrderItemInputType])
  items!: CreateConsumptionOrderItemInputType[];
}

@ArgsType()
export class UpdateConsumptionOrderArgs {
  @Field(() => ID)
  id!: string;

  @Field(() => String, { nullable: true })
  description?: string;

  /** Replaces every line. Refused once the order has moved any stock. */
  @Field(() => [CreateConsumptionOrderItemInputType], { nullable: true })
  items?: CreateConsumptionOrderItemInputType[];
}

@InputType()
export class ConsumptionOrderLineInputType {
  @Field(() => ID)
  itemId!: string;

  /** Omit for whatever is outstanding on that line. */
  @Field(() => Float, { nullable: true })
  quantity?: number;
}

@ArgsType()
export class ConsumptionOrderActionArgs {
  @Field(() => ID)
  orderId!: string;

  /** Omit to act on every line of the order. */
  @Field(() => [ConsumptionOrderLineInputType], { nullable: true })
  items?: ConsumptionOrderLineInputType[];
}

@ArgsType()
export class FindConsumptionOrderArgs extends PaginationArgs {
  @Field(() => [ID], { nullable: true })
  ids?: string[];

  @Field(() => String, { nullable: true })
  key?: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => ID, { nullable: true })
  materialId?: string;

  @Field(() => ID, { nullable: true })
  batchId?: string;

  /** Matches either the source or the consuming location. */
  @Field(() => ID, { nullable: true })
  locationId?: string;

  @Field(() => String, { nullable: true })
  createdBy?: string;

  @Field(() => Date, { nullable: true })
  createdAtFrom?: Date;

  @Field(() => Date, { nullable: true })
  createdAtTo?: Date;

  @Field(() => Boolean, { nullable: true })
  includeRemoved?: boolean;
}
