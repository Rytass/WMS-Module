import { Field, Float, ID, ObjectType } from '@nestjs/graphql';
import { PaginatedResponse } from './pagination.dto';

@ObjectType()
export class ReceiveInventoryOrderItemDto {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  description!: string;

  @Field(() => ID)
  unitId!: string;

  @Field(() => Float)
  targetReceivedQuantity!: number;

  @Field(() => Float)
  actualReceivedQuantity!: number;

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
export class ReceiveInventoryOrderItems extends PaginatedResponse(
  ReceiveInventoryOrderItemDto
) {}
