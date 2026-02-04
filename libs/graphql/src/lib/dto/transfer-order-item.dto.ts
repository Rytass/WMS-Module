import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { PaginatedResponse } from './pagination.dto';

@ObjectType()
export class TransferOrderItemDto {
  @Field(() => ID)
  id!: string;

  materialId!: string;

  batchId!: string;

  locationId!: string;

  loaderId!: string | null;

  orderId!: string;

  unitId!: string | null;

  @Field(() => Int)
  targetTransferredQuantity!: number;

  @Field(() => Date, { nullable: true })
  removedAt!: Date | null;
}

@ObjectType()
export class TransferOrderItems extends PaginatedResponse(
  TransferOrderItemDto,
) {}
