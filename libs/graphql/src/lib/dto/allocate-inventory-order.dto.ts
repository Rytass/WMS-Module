import { Field, ID, ObjectType } from '@nestjs/graphql';
import { PaginatedResponse } from './pagination.dto';

@ObjectType()
export class AllocateInventoryOrderDto {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  key!: string;

  @Field(() => String)
  description!: string;

  @Field(() => String)
  reason!: string;

  @Field(() => Date)
  createdAt!: Date;
}

@ObjectType()
export class AllocateInventoryOrders extends PaginatedResponse(
  AllocateInventoryOrderDto,
) {}
