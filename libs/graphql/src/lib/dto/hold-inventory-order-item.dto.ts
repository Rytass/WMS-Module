import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { PaginatedResponse } from './pagination.dto';

@ObjectType()
export class HoldInventoryOrderItemDto {
  @Field(() => ID)
  id!: string;

  materialId!: string;

  batchId!: string;

  locationId!: string | null;

  loaderId!: string | null;

  orderId!: string;

  unitId!: string | null;

  @Field(() => Int)
  targetHeldQuantity!: number;

  @Field(() => Date, { nullable: true })
  removedAt!: Date | null;
}

@ObjectType()
export class HoldInventoryOrderItems extends PaginatedResponse(
  HoldInventoryOrderItemDto,
) {}
