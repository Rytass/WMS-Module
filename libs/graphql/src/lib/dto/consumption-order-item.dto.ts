import { Field, Float, ID, ObjectType } from '@nestjs/graphql';
import { PaginatedResponse } from './pagination.dto';

@ObjectType()
export class ConsumptionOrderItemDto {
  @Field(() => ID)
  id!: string;

  materialId!: string;

  batchId!: string;

  locationId!: string;

  loaderId!: string | null;

  targetLocationId!: string | null;

  targetLoaderId!: string | null;

  orderId!: string;

  @Field(() => String, { nullable: true })
  unitId!: string | null;

  @Field(() => Float)
  targetConsumedQuantity!: number;

  @Field(() => Date, { nullable: true })
  removedAt!: Date | null;
}

@ObjectType()
export class ConsumptionOrderItems extends PaginatedResponse(
  ConsumptionOrderItemDto,
) {}
