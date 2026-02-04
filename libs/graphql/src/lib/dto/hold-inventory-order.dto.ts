import { Field, ID, ObjectType } from '@nestjs/graphql';
import { HoldInventoryOrderItemDto } from './hold-inventory-order-item.dto';
import { PaginatedResponse } from './pagination.dto';

@ObjectType()
export class HoldInventoryOrderDto {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  key!: string;

  @Field(() => String, { nullable: true })
  createdBy!: string | null;

  @Field(() => Date, { nullable: true })
  removedAt!: Date | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => [HoldInventoryOrderItemDto])
  items!: HoldInventoryOrderItemDto[];
}

@ObjectType()
export class HoldInventoryOrders extends PaginatedResponse(
  HoldInventoryOrderDto,
) {}
