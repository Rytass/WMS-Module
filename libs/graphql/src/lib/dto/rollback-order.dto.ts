import { Field, ID, ObjectType } from '@nestjs/graphql';
import { PaginatedResponse } from './pagination.dto';

@ObjectType()
export class RollbackOrderItemDto {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  targetOrderId!: string;

  @Field(() => ID)
  reverseOrderId!: string;

  @Field(() => String, { nullable: true })
  targetKind!: string | null;

  @Field(() => Date)
  createdAt!: Date;
}

@ObjectType()
export class RollbackOrderDto {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  key!: string;

  @Field(() => String)
  description!: string;

  @Field(() => String, { nullable: true })
  reason!: string | null;

  @Field(() => String, { nullable: true })
  createdBy!: string | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date, { nullable: true })
  removedAt!: Date | null;

  @Field(() => [RollbackOrderItemDto])
  items!: RollbackOrderItemDto[];
}

@ObjectType()
export class RollbackOrders extends PaginatedResponse(RollbackOrderDto) {}
