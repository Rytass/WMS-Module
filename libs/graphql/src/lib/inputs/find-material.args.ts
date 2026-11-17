import { Field, ArgsType, InputType, registerEnumType } from '@nestjs/graphql';
import { MaterialSortField } from '@rytass/wms-module-core';
import { PaginationArgs } from './pagination.args';
import { SortInput } from './sort.input';

registerEnumType(MaterialSortField, { name: 'MaterialSortField' });

@InputType()
export class MaterialSortInput extends SortInput(MaterialSortField) {}

@ArgsType()
export class FindMaterialArgs extends PaginationArgs {
  @Field(() => String, { nullable: true })
  key?: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => MaterialSortInput, {
    nullable: true,
    description: 'Omitted: newest first (createdAt DESC), then id.',
  })
  sort?: MaterialSortInput | null;
}
