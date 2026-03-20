import { Field, ID, ObjectType } from '@nestjs/graphql';
import { TransferCustomerOrderItemDto } from './transfer-customer-order-item.dto';
import { PaginatedResponse } from './pagination.dto';

@ObjectType()
export class TransferCustomerOrderDto {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  key!: string;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => [TransferCustomerOrderItemDto])
  items!: TransferCustomerOrderItemDto[];
}

@ObjectType()
export class TransferCustomerOrders extends PaginatedResponse(
  TransferCustomerOrderDto,
) {}
