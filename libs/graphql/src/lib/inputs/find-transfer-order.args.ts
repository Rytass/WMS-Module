import { ArgsType, Field, ID } from '@nestjs/graphql';
import { DateRangeArgs } from './date-range.args';
import { PaginationArgs } from './pagination.args';

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
}
