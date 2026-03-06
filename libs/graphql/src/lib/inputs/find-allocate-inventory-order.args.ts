import { ArgsType, Field, ID } from '@nestjs/graphql';
import { PaginationArgs } from './pagination.args';
import { DateRangeArgs } from './date-range.args';

@ArgsType()
export class FindAllocateInventoryOrderArgs extends PaginationArgs {
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
