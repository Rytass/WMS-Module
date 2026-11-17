import { ArgsType, Field, InputType, registerEnumType } from '@nestjs/graphql';
import {
  AggregatedStockSortField,
  StockGroupedByMaterialSortField,
} from '@rytass/wms-module-core';
import { FindStockArgs } from './find-stock.args';
import { SortInput } from './sort.input';

registerEnumType(AggregatedStockSortField, {
  name: 'AggregatedStockSortField',
});

registerEnumType(StockGroupedByMaterialSortField, {
  name: 'StockGroupedByMaterialSortField',
});

@InputType()
export class AggregatedStockSortInput extends SortInput(
  AggregatedStockSortField,
) {}

@InputType()
export class StockGroupedByMaterialSortInput extends SortInput(
  StockGroupedByMaterialSortField,
) {}

/** `aggregatedStocks`: the stock filters plus its own sort. */
@ArgsType()
export class FindAggregatedStockArgs extends FindStockArgs {
  @Field(() => AggregatedStockSortInput, {
    nullable: true,
    description:
      'Omitted: by the group key (material id, batch id, location id, loader id, status). A sort is followed by that same key.',
  })
  sort?: AggregatedStockSortInput | null;
}

/** `stocksGroupedByMaterial`: the stock filters plus its own sort. */
@ArgsType()
export class FindStockGroupedByMaterialArgs extends FindStockArgs {
  @Field(() => StockGroupedByMaterialSortInput, {
    nullable: true,
    description: 'Omitted: material key ascending. Ties by material id.',
  })
  sort?: StockGroupedByMaterialSortInput | null;
}
