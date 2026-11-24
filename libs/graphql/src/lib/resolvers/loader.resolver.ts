import {
  Context,
  Float,
  Parent,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { LoaderDto, LoaderTypeDto } from '../dto';
import {
  addQuantity,
  LoaderTypeEntityClass,
  LoadersEntityClass,
  LocationEntityClass,
  StockService,
  WmsEntities,
} from '@rytass/wms-module-core';
import { type LoaderType } from '../helpers';
import { LocationDto } from '../dto/location.dto';

@Resolver(() => LoaderDto)
export class LoaderResolver {
  /**
   * The configured entities, not the built-in classes: `__entity` decides which
   * repository the DataLoader opens, so it has to follow whatever the consumer
   * passed to `WMSBaseModuleOptions`. Loading a built-in class outright filters
   * on its single-table-inheritance discriminator and resolves nothing for an
   * override.
   */
  constructor(
    private readonly entities: WmsEntities,
    private readonly stockService: StockService,
  ) {}

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
      __entity: this.entities.location,
      __from: { id: locationId },
    });
  }

  @ResolveField(() => Float)
  async totalQuantity(@Parent() { id }: LoadersEntityClass) {
    const [aggregatedStocks] = await this.stockService.findAggregatedStocks({
      loaderId: id,
    });
    if (!aggregatedStocks.length) return 0;
    return aggregatedStocks.reduce(
      (total, { quantity }) => addQuantity(total, quantity),
      0,
    );
  }
}
