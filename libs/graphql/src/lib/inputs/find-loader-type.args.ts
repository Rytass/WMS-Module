import { ArgsType, Field, InputType, registerEnumType } from '@nestjs/graphql';
import { LoaderTypeSortField } from '@rytass/wms-module-core';
import { PaginationArgs } from './pagination.args';
import { DateRangeArgs } from './date-range.args';
import { SortInput } from './sort.input';

registerEnumType(LoaderTypeSortField, { name: 'LoaderTypeSortField' });

@InputType()
export class LoaderTypeSortInput extends SortInput(LoaderTypeSortField) {}

@ArgsType()
export class FindLoaderTypeArgs extends PaginationArgs {
  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => Boolean, { nullable: true })
  isActive?: boolean;

  @Field(() => DateRangeArgs, { nullable: true })
  dateRange?: DateRangeArgs;

  @Field(() => String, { nullable: true })
  key?: string;

  @Field(() => LoaderTypeSortInput, {
    nullable: true,
    description: 'Omitted: newest first (createdAt DESC), then id.',
  })
  sort?: LoaderTypeSortInput | null;
}
