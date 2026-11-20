import { ArgsType, Field, InputType, registerEnumType } from '@nestjs/graphql';
import { LocationSortField } from '@rytass/wms-module-core';
import { PaginationArgs } from './pagination.args';
import { SortInput } from './sort.input';

registerEnumType(LocationSortField, { name: 'LocationSortField' });

@InputType()
export class LocationSortInput extends SortInput(LocationSortField) {}

@ArgsType()
export class FindLocationArgs extends PaginationArgs {
  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => Boolean, { nullable: true })
  isActive?: boolean;

  @Field(() => String, { nullable: true })
  key?: string;

  @Field(() => [String], {
    nullable: true,
    description:
      'Exact, case-sensitive match on the location key, for a scanned label. `key` is a substring search; this is not.',
  })
  keys?: string[];

  @Field(() => LocationSortInput, {
    nullable: true,
    description: 'Omitted: newest first (createdAt DESC), then id.',
  })
  sort?: LocationSortInput | null;
}
