import { Field, Float, ID, ObjectType } from '@nestjs/graphql';
import { PaginatedResponse } from './pagination.dto';

@ObjectType()
export class ShipInventoryOrderItemDto {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  description!: string;

  @Field(() => ID)
  unitId!: string;

  @Field(() => Float)
  targetShippedQuantity!: number;

  @Field(() => Float)
  actualShippedQuantity!: number;

  @Field(() => ID)
  orderId!: string;

  @Field(() => ID)
  materialId!: string;

  @Field(() => ID)
  batchId!: string;

  @Field(() => ID, { nullable: true })
  stockId!: string | null;

  @Field(() => Date, { nullable: true })
  removedAt!: Date | null;
}

@ObjectType()
export class ShipInventoryOrderItems extends PaginatedResponse(
  ShipInventoryOrderItemDto
) {}
