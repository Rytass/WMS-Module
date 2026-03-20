import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { PaginatedResponse } from './pagination.dto';

@ObjectType()
export class TransferCustomerOrderItemDto {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  materialId!: string;

  @Field(() => ID)
  batchId!: string;

  @Field(() => ID, { nullable: true })
  locationId!: string | null;

  @Field(() => ID, { nullable: true })
  loaderId!: string | null;

  @Field(() => String)
  customerId!: string;

  @Field(() => ID)
  orderId!: string;

  @Field(() => ID, { nullable: true })
  unitId!: string | null;

  @Field(() => Int)
  targetTransferredQuantity!: number;
}

@ObjectType()
export class TransferCustomerOrderItems extends PaginatedResponse(
  TransferCustomerOrderItemDto,
) {}
