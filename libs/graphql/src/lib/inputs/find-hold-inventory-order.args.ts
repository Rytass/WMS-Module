import { ArgsType, Field, ID } from '@nestjs/graphql';
import { DateRangeArgs } from './date-range.args';
import { PaginationArgs } from './pagination.args';

@ArgsType()
export class FindHoldInventoryOrderArgs extends PaginationArgs {
  @Field(() => String, { nullable: true })
  key?: string;

  @Field(() => DateRangeArgs, { nullable: true })
  dateRange?: DateRangeArgs;

  @Field(() => ID, { nullable: true })
  materialId?: string;

  @Field(() => ID, { nullable: true })
  batchId?: string;

  @Field(() => ID, { nullable: true })
  locationId?: string;

  @Field(() => ID, { nullable: true })
  loaderId?: string;
}
