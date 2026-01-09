import { Field, ID, ObjectType } from '@nestjs/graphql';
import { ShipInventoryOrderItemDto } from './ship-inventory-order-item.dto';
import { PaginatedResponse } from './pagination.dto';

@ObjectType()
export class ShipInventoryOrderDto {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  description!: string;

  @Field(() => String)
  createdBy!: string;

  @Field(() => Date, { nullable: true })
  removedAt!: Date | null;

  @Field(() => [ShipInventoryOrderItemDto], { nullable: true })
  items?: ShipInventoryOrderItemDto[];
}

@ObjectType()
export class ShipInventoryOrders extends PaginatedResponse(
  ShipInventoryOrderDto
) {}
