import { Field, ID, ObjectType } from '@nestjs/graphql';
import { ShipInventoryOrderItemDto } from './ship-inventory-order-item.dto';
import { PaginatedResponse } from './pagination.dto';
import { ShipInventoryOrderStatus } from '@wms-module/core';

@ObjectType()
export class ShipInventoryOrderDto {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  key!: string;

  @Field(() => String)
  description!: string;

  @Field(() => String)
  createdBy!: string;

  @Field(() => Date, { nullable: true })
  removedAt!: Date | null;

  @Field(() => [ShipInventoryOrderItemDto])
  items!: ShipInventoryOrderItemDto[];

  @Field(() => ShipInventoryOrderStatus)
  status!: ShipInventoryOrderStatus;
}

@ObjectType()
export class ShipInventoryOrders extends PaginatedResponse(
  ShipInventoryOrderDto,
) {}
