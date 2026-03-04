import { Field, Float, ID, ObjectType } from '@nestjs/graphql';
import { PaginatedResponse } from './pagination.dto';

@ObjectType()
export class ReceiveInventoryOrderItemDto {
  @Field(() => ID)
  id!: string;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => ID, { nullable: true })
  unitId!: string | null;

  @Field(() => Float)
  targetReceivedQuantity!: number;

  @Field(() => ID)
  orderId!: string;

  materialId!: string;
  batchId!: string | null;
  locationId!: string | null;
  loaderId!: string | null;

  @Field(() => Date, { nullable: true })
  removedAt!: Date | null;

  @Field(() => Boolean)
  requireInspection!: boolean;
}

@ObjectType()
export class ReceiveInventoryOrderItems extends PaginatedResponse(
  ReceiveInventoryOrderItemDto,
) {}
