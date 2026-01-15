import { Field, Float, ID, ObjectType } from '@nestjs/graphql';
import { PaginatedResponse } from './pagination.dto';

@ObjectType()
export class ReceiveInventoryOrderItemDto {
  @Field(() => ID)
  id!: string;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => ID)
  unitId!: string;

  @Field(() => Float)
  targetReceivedQuantity!: number;

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
export class ReceiveInventoryOrderItems extends PaginatedResponse(
  ReceiveInventoryOrderItemDto,
) {}
