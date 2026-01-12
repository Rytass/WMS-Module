import { Field, ID, ObjectType } from '@nestjs/graphql';
import { ReceiveInventoryOrderItemDto } from './receive-inventory-order-item.dto';
import { PaginatedResponse } from './pagination.dto';

@ObjectType()
export class ReceiveInventoryOrderDto {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  description!: string;

  @Field(() => String)
  createdBy!: string;

  @Field(() => Date, { nullable: true })
  removedAt!: Date | null;

  @Field(() => [ReceiveInventoryOrderItemDto])
  items!: ReceiveInventoryOrderItemDto[];
}

@ObjectType()
export class ReceiveInventoryOrders extends PaginatedResponse(
  ReceiveInventoryOrderDto
) {}
