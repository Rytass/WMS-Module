import { Field, ID, ArgsType, registerEnumType } from '@nestjs/graphql';
import { PaginationArgs } from './pagination.args';
import { DateRangeArgs } from './date-range.args';

export enum ShipInventoryOrderStatusEnum {
  PENDING = 'PENDING',
  SHIPPED = 'SHIPPED',
  REMOVED = 'REMOVED',
  PARTIAL_SHIPPED = 'PARTIAL_SHIPPED',
}

registerEnumType(ShipInventoryOrderStatusEnum, {
  name: 'ShipInventoryOrderStatus',
});

@ArgsType()
export class FindShipInventoryOrderArgs extends PaginationArgs {
  @Field(() => ID, { nullable: true })
  id?: string;

  @Field(() => String, { nullable: true })
  createdBy?: string;

  @Field(() => ShipInventoryOrderStatusEnum, { nullable: true })
  status?: ShipInventoryOrderStatusEnum;

  @Field(() => DateRangeArgs, { nullable: true })
  dateRange?: DateRangeArgs;

  @Field(() => String, { nullable: true })
  description?: string;
}
