import {
  Field,
  ID,
  ArgsType,
  InputType,
  registerEnumType,
} from '@nestjs/graphql';
import { PaginationArgs } from './pagination.args';
import { DateRangeArgs } from './date-range.args';
import { SortInput } from './sort.input';
import {
  ReceiveInventoryOrderSortField,
  ReceiveInventoryOrderStatus,
} from '@rytass/wms-module-core';

registerEnumType(ReceiveInventoryOrderSortField, {
  name: 'ReceiveInventoryOrderSortField',
});

@InputType()
export class ReceiveInventoryOrderSortInput extends SortInput(
  ReceiveInventoryOrderSortField,
) {}

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

  @Field(() => [ReceiveInventoryOrderStatus], { nullable: true })
  statuses?: ReceiveInventoryOrderStatus[];

  @Field(() => DateRangeArgs, { nullable: true })
  dateRange?: DateRangeArgs;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  key?: string;

  @Field(() => String, { nullable: true })
  materialKey?: string;

  @Field(() => String, { nullable: true })
  batchKey?: string;

  @Field(() => String, { nullable: true })
  locationKey?: string;

  @Field(() => String, { nullable: true })
  loaderKey?: string;

  @Field(() => ReceiveInventoryOrderSortInput, {
    nullable: true,
    description: 'Omitted: newest first (createdAt DESC), then id.',
  })
  sort?: ReceiveInventoryOrderSortInput | null;
}
