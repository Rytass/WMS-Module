import { Field, ID, ArgsType, registerEnumType } from '@nestjs/graphql';
import { PaginationArgs } from './pagination.args';
import { DateRangeArgs } from './date-range.args';
import { ShipInventoryOrderStatus } from '@wms-module/core';

registerEnumType(ShipInventoryOrderStatus, {
  name: 'ShipInventoryOrderStatus',
});

@ArgsType()
export class FindShipInventoryOrderArgs extends PaginationArgs {
  @Field(() => ID, { nullable: true })
  id?: string;

  @Field(() => String, { nullable: true })
  createdBy?: string;

  @Field(() => ShipInventoryOrderStatus, { nullable: true })
  status?: ShipInventoryOrderStatus;

  @Field(() => [ShipInventoryOrderStatus], { nullable: true })
  statuses?: ShipInventoryOrderStatus[];

  @Field(() => DateRangeArgs, { nullable: true })
  dateRange?: DateRangeArgs;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  key?: string;
}
