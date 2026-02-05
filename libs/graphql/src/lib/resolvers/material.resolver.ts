import { Context, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AggregatedStockDto, MaterialDto, MaterialUnitDto } from '../dto';
import {
  MaterialEntityClass,
  MaterialUnitEntityClass,
  StockEntityClass,
  StockService,
  UnitEntityClass,
} from '@wms-module/core';
import { type LoaderType } from '../helpers';
import { groupBy, sumBy } from 'lodash';
import { UnitDto } from '../dto/unit.dto';
import { SelectQueryBuilder } from 'typeorm';

@Resolver(() => MaterialDto)
export class MaterialResolver {
  constructor(private readonly stockService: StockService) {}

  @ResolveField(() => [AggregatedStockDto])
  async aggregatedStock(
    @Parent() { id }: MaterialEntityClass,
  ): Promise<AggregatedStockDto[]> {
    // TODO: should be compatible with dataloader in the future
    const [items] = await this.stockService.findAggregatedStocks({
      materialId: id,
    });
    return items;
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

  @ResolveField(() => UnitDto)
  async baseUnit(
    @Parent() { baseUnit }: MaterialEntityClass,
    @Context() { loaders }: LoaderType<UnitEntityClass>,
  ): Promise<UnitDto> {
    return loaders.batchSingle.load({
      __entity: UnitEntityClass,
      __from: { id: baseUnit },
    });
  }
}
