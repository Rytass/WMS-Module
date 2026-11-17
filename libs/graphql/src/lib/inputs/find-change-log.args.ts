import { ArgsType, Field, InputType, registerEnumType } from '@nestjs/graphql';
import { ChangeLogSortField } from '@rytass/wms-module-core';
import { FindStockArgs } from './find-stock.args';
import { SortInput } from './sort.input';

registerEnumType(ChangeLogSortField, { name: 'ChangeLogSortField' });

@InputType()
export class ChangeLogSortInput extends SortInput(ChangeLogSortField) {}

/**
 * The stock filters plus the change log's own sort. A subclass rather than a
 * field on `FindStockArgs`, so each stock list keeps its own sort enum.
 */
@ArgsType()
export class FindChangeLogArgs extends FindStockArgs {
  @Field(() => ChangeLogSortInput, {
    nullable: true,
    description: 'Omitted: newest first (createdAt DESC), then id.',
  })
  sort?: ChangeLogSortInput | null;
}
