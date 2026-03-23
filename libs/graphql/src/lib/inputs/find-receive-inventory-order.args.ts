import { Field, ID, ArgsType, registerEnumType } from '@nestjs/graphql';
import { PaginationArgs } from './pagination.args';
import { DateRangeArgs } from './date-range.args';
import { ReceiveInventoryOrderStatus } from '@wms-module/core';

registerEnumType(ReceiveInventoryOrderStatus, {
  name: 'ReceiveInventoryOrderStatus',
});

@ArgsType()
export class FindReceiveInventoryOrderArgs extends PaginationArgs {
  @Field(() => ID, { nullable: true })
  id?: string;

  @Field(() => String, { nullable: true })
  createdBy?: string;

  @Field(() => ReceiveInventoryOrderStatus, { nullable: true })
  status?: ReceiveInventoryOrderStatus;

  @Field(() => DateRangeArgs, { nullable: true })
  dateRange?: DateRangeArgs;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  key?: string;
}
