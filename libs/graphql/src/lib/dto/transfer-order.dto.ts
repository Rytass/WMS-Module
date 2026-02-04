import { Field, ID, ObjectType } from '@nestjs/graphql';
import { TransferOrderItemDto } from './transfer-order-item.dto';
import { PaginatedResponse } from './pagination.dto';

@ObjectType()
export class TransferOrderDto {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  key!: string;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => String, { nullable: true })
  receiver!: string | null;

  @Field(() => String, { nullable: true })
  createdBy!: string | null;

  @Field(() => Date, { nullable: true })
  removedAt!: Date | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => [TransferOrderItemDto])
  items!: TransferOrderItemDto[];
}

@ObjectType()
export class TransferOrders extends PaginatedResponse(TransferOrderDto) {}
