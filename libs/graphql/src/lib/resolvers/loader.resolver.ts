import { Context, Int, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { LoaderDto, LoaderTypeDto } from '../dto';
import {
  LoadersEntityClass,
  LoaderTypeEntityClass,
  LocationEntityClass,
  StockService,
} from '@rytass/wms-module-core';
import { type LoaderType } from '../helpers';
import { LocationDto } from '../dto/location.dto';
import _ from 'lodash';

@Resolver(() => LoaderDto)
export class LoaderResolver {
  constructor(private readonly stockService: StockService) {}

  @ResolveField(() => LoaderTypeDto)
  type(
    @Parent() { typeId }: LoadersEntityClass,
    @Context() { loaders }: LoaderType<LoaderTypeEntityClass>,
  ) {
    return loaders.batchSingle.load({
      __entity: LoaderTypeEntityClass,
      __from: { id: typeId },
    });
  }

  @ResolveField(() => LocationDto)
  location(
    @Parent() { locationId }: LoadersEntityClass,
    @Context() { loaders }: LoaderType<LocationEntityClass>,
  ) {
    return loaders.batchSingle.load({
      __entity: LocationEntityClass,
      __from: { id: locationId },
    });
  }

  @ResolveField(() => Int)
  async totalQuantity(@Parent() { id }: LoadersEntityClass) {
    const [aggregatedStocks] = await this.stockService.findAggregatedStocks({
      loaderId: id,
      aggregated: true,
    });
    if (!aggregatedStocks.length) return 0;
    return aggregatedStocks.reduce(
      (total, { quantity }) => total + _.toInteger(quantity),
      0,
    );
  }
}
