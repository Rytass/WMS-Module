import { Field, ID, ObjectType } from '@nestjs/graphql';
import { ReceiveInventoryOrderItemDto } from './receive-inventory-order-item.dto';
import { PaginatedResponse } from './pagination.dto';
import { ReceiveInventoryOrderStatus } from '@wms-module/core';

@ObjectType()
export class ReceiveInventoryOrderDto {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  key!: string;

  @Field(() => String)
  description!: string;

  @Field(() => String, { nullable: true })
  createdBy!: string | null;

  @Field(() => Date, { nullable: true })
  removedAt!: Date | null;

  @Field(() => [ReceiveInventoryOrderItemDto])
  items!: ReceiveInventoryOrderItemDto[];

  @Field(() => ReceiveInventoryOrderStatus)
  status!: ReceiveInventoryOrderStatus;
}

@ObjectType()
export class ReceiveInventoryOrders extends PaginatedResponse(
  ReceiveInventoryOrderDto,
) {}
