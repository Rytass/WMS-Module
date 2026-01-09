import { Field, ID, ArgsType, registerEnumType } from '@nestjs/graphql';
import { PaginationArgs } from './pagination.args';
import { DateRangeArgs } from './date-range.args';

export enum ReceiveInventoryOrderStatusEnum {
  PENDING = 'PENDING',
  RECEIVED = 'RECEIVED',
  REMOVED = 'REMOVED',
  PARTIAL_RECEIVED = 'PARTIAL_RECEIVED',
}

registerEnumType(ReceiveInventoryOrderStatusEnum, {
  name: 'ReceiveInventoryOrderStatus',
});

@ArgsType()
export class FindReceiveInventoryOrderArgs extends PaginationArgs {
  @Field(() => ID, { nullable: true })
  id?: string;

  @Field(() => String, { nullable: true })
  createdBy?: string;

  @Field(() => ReceiveInventoryOrderStatusEnum, { nullable: true })
  status?: ReceiveInventoryOrderStatusEnum;

  @Field(() => DateRangeArgs, { nullable: true })
  dateRange?: DateRangeArgs;

  @Field(() => String, { nullable: true })
  description?: string;
}
