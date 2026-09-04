import { Field, ID, ObjectType } from '@nestjs/graphql';
import { ConsumptionOrderItemDto } from './consumption-order-item.dto';
import { PaginatedResponse } from './pagination.dto';

@ObjectType()
export class ConsumptionOrderDto {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  key!: string;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => String, { nullable: true })
  createdBy!: string | null;

  @Field(() => Date, { nullable: true })
  removedAt!: Date | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => [ConsumptionOrderItemDto])
  items!: ConsumptionOrderItemDto[];
}

@ObjectType()
export class ConsumptionOrders extends PaginatedResponse(ConsumptionOrderDto) {}
