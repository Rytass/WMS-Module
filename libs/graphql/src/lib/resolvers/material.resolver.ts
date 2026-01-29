import { Context, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AggregatedStockDto, MaterialDto, MaterialUnitDto } from '../dto';
import {
  MaterialEntityClass,
  MaterialUnitEntityClass,
  StockEntityClass,
  StockService,
} from '@wms-module/core';
import { type LoaderType } from '../helpers';
import { groupBy, sumBy } from 'lodash';

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

    return Object.values(
      groupBy(stocks, (stock) =>
        this.stockService.aggregateKeys.map((key) => stock[key]).join('|'),
      ),
    ).reduce<AggregatedStockDto[]>((acc, group) => {
      const [item] = group;
      const quantity = sumBy(group, 'quantity');
      if (quantity !== 0) {
        acc.push({
          materialId: item.materialId,
          batchId: item.batchId,
          locationId: item.locationId,
          loaderId: item.loaderId,
          status: item.status,
          quantity,
        });
      }
      return acc;
    }, []);
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
