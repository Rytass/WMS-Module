import { Field, ID, ObjectType } from '@nestjs/graphql';
import { TransferVendorOrderItemDto } from './transfer-vendor-order-item.dto';
import { PaginatedResponse } from './pagination.dto';

@ObjectType()
export class TransferVendorOrderDto {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  key!: string;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => [TransferVendorOrderItemDto])
  items!: TransferVendorOrderItemDto[];
}

@ObjectType()
export class TransferVendorOrders extends PaginatedResponse(
  TransferVendorOrderDto,
) {}
