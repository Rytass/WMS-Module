import { Context, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { LocationDto } from '../dto/location.dto';
import { type LoaderType } from '../helpers';
import {
  LocationEntityClass,
  WmsEntities,
} from '@rytass/wms-module-core';
import { MapRangeDto } from '../dto/warehouse-map.dto';

@Resolver(() => MapRangeDto)
export class MapRangeUnionResolver {
  /**
   * The configured entities, not the built-in classes: `__entity` decides which
   * repository the DataLoader opens, so it has to follow whatever the consumer
   * passed to `WMSBaseModuleOptions`. Loading a built-in class outright filters
   * on its single-table-inheritance discriminator and resolves nothing for an
   * override.
   */
  constructor(private readonly entities: WmsEntities) {}

  @ResolveField(() => LocationDto, { nullable: true })
  location(
    @Parent() { id }: MapRangeDto,
    @Context() { loaders }: LoaderType<LocationEntityClass>,
  ) {
    if (!id) return null;
    return loaders.batchSingle.load({
      __entity: this.entities.location,
      __from: { key: id },
    });
  }
}
