import { Field, ID, ArgsType } from '@nestjs/graphql';
import { PaginationArgs } from './pagination.args';
import { DateRangeArgs } from './date-range.args';

@ArgsType()
export class FindLoaderArgs extends PaginationArgs {
  @Field(() => ID, { nullable: true })
  typeId?: string;

  @Field(() => [ID], { nullable: true })
  typeIds?: string[];

  @Field(() => ID, { nullable: true })
  locationId?: string;

  @Field(() => [ID], { nullable: true })
  locationIds?: string[];

  @Field(() => String, { nullable: true })
  serialId?: string;

  @Field(() => [String], { nullable: true })
  serialIds?: string[];

  @Field(() => Boolean, { nullable: true })
  isActive?: boolean;

  @Field(() => DateRangeArgs, { nullable: true })
  dateRange?: DateRangeArgs;

  @Field(() => String, { nullable: true })
  note?: string;
}
