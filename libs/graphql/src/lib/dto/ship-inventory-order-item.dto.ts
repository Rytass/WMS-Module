import { Field, Float, ID, ObjectType } from '@nestjs/graphql';
import { PaginatedResponse } from './pagination.dto';

@ObjectType()
export class ShipInventoryOrderItemDto {
  @Field(() => ID)
  id!: string;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => ID, { nullable: true })
  unitId!: string | null;

  @Field(() => Float)
  targetShippedQuantity!: number;

  @Field(() => ID)
  orderId!: string;

  @Field(() => ID)
  materialId!: string;

  @Field(() => ID, { nullable: true })
  batchId!: string | null;

  @Field(() => Date, { nullable: true })
  removedAt!: Date | null;
}

@ObjectType()
export class ShipInventoryOrderItems extends PaginatedResponse(
  ShipInventoryOrderItemDto,
) {}
