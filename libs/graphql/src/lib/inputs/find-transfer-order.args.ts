import {
  ArgsType,
  Field,
  ID,
  InputType,
  registerEnumType,
} from '@nestjs/graphql';
import { TransferOrderSortField } from '@rytass/wms-module-core';
import { DateRangeArgs } from './date-range.args';
import { PaginationArgs } from './pagination.args';
import { SortInput } from './sort.input';

registerEnumType(TransferOrderSortField, { name: 'TransferOrderSortField' });

@InputType()
export class TransferOrderSortInput extends SortInput(TransferOrderSortField) {}

@ArgsType()
export class FindTransferOrderArgs extends PaginationArgs {
  @Field(() => String, { nullable: true })
  key?: string;

  @Field(() => String, { nullable: true })
  receiver?: string;

  @Field(() => DateRangeArgs, { nullable: true })
  dateRange?: DateRangeArgs;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => ID, { nullable: true })
  materialId?: string;

  @Field(() => ID, { nullable: true })
  batchId?: string;

  @Field(() => ID, { nullable: true })
  locationId?: string;

  @Field(() => ID, { nullable: true })
  loaderId?: string;

  @Field(() => String, { nullable: true })
  materialKey?: string;

  @Field(() => String, { nullable: true })
  batchKey?: string;

  @Field(() => String, { nullable: true })
  locationKey?: string;

  @Field(() => String, { nullable: true })
  loaderKey?: string;

  @Field(() => String, { nullable: true })
  targetLocationKey?: string;

  @Field(() => String, { nullable: true })
  targetLoaderKey?: string;

  @Field(() => TransferOrderSortInput, {
    nullable: true,
    description: 'Omitted: newest first (createdAt DESC), then id.',
  })
  sort?: TransferOrderSortInput | null;
}
