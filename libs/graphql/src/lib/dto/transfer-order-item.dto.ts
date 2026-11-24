import { Field, ID, Float, ObjectType } from '@nestjs/graphql';
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

  @Field(() => String, { nullable: true })
  unitId!: string | null;

  @Field(() => Float)
  targetTransferredQuantity!: number;

  @Field(() => Date, { nullable: true })
  removedAt!: Date | null;
}

@ObjectType()
export class TransferOrderItems extends PaginatedResponse(
  TransferOrderItemDto,
) {}
