import { Context, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import {
  AggregatedStockDto,
  MaterialDto,
  MaterialUnitDto,
  StockDto,
} from '../dto';
import {
  MaterialEntityClass,
  MaterialUnitEntityClass,
  StockEntityClass,
  StockService,
} from '@wms-module/core';
import { type LoaderType } from '../helpers';

@Resolver(() => MaterialDto)
export class MaterialResolver {
  constructor(private readonly stockService: StockService) {}

  @ResolveField(() => [AggregatedStockDto])
  async aggregatedStock(
    @Parent() { id }: MaterialEntityClass,
    @Context() { loaders }: LoaderType<StockEntityClass>,
  ): Promise<AggregatedStockDto[]> {
    const stocks = await loaders.batchMany.load({
      __entity: StockEntityClass,
      __from: { materialId: id },
    });

    return this.stockService.aggregateStocks(stocks);
  }

  @ResolveField(() => [MaterialUnitDto])
  materialUnits(
    @Parent() { id }: MaterialEntityClass,
    @Context() { loaders }: LoaderType<MaterialUnitEntityClass>,
  ) {
    return loaders.batchMany.load({
      __entity: MaterialUnitEntityClass,
      __from: { materialId: id },
    });
  }
}
