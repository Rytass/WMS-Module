import { Context, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { LocationDto } from '../dto/location.dto';
import { MapDataDto } from '../dto/warehouse-map.dto';
import { type LoaderType } from '../helpers';
import { WarehouseMapEntity } from '@rytass/wms-base-nestjs-module/models/warehouse-map.entity';
import {
  LocationEntityClass,
  WmsEntities,
} from '@rytass/wms-module-core';

@Resolver(() => LocationDto)
export class LocationResolver {
  /**
   * The configured entities, not the built-in classes: `__entity` decides which
   * repository the DataLoader opens, so it has to follow whatever the consumer
   * passed to `WMSBaseModuleOptions`. Loading a built-in class outright filters
   * on its single-table-inheritance discriminator and resolves nothing for an
   * override.
   */
  constructor(private readonly entities: WmsEntities) {}

  @ResolveField(() => MapDataDto, { nullable: true })
  async mapData(
    @Parent() { id }: LocationDto,
    @Context() { loaders }: LoaderType<WarehouseMapEntity>,
  ): Promise<MapDataDto | null> {
    const map = await loaders.batchSingle.load({
      __entity: this.entities.warehouseMap,
      __from: { id },
    });
    return map?.mapData || null;
  }

  @ResolveField(() => LocationDto, { nullable: true })
  parent(
    @Parent() { parentId }: LocationEntityClass,
    @Context() { loaders }: LoaderType<LocationEntityClass>,
  ) {
    if (!parentId) return null;
    return loaders.batchSingle.load({
      __entity: this.entities.location,
      __from: { id: parentId },
    });
  }

  /**
   * `children` must never be read off the parent entity: only
   * `LocationQuery.location` and `LocationService.findMany` eager-load the tree
   * relation. Every other producer of a `LocationDto` (stock/loader/change-log/
   * transfer/ship/receive/warehouse-map resolvers, the `parent` field above and
   * the create/update mutations) hands back an entity whose `children` is
   * `undefined`, which breaks the non-nullable list. Always resolve through the
   * request-scoped loader instead.
   */
  @ResolveField(() => [LocationDto])
  children(
    @Parent() { id }: LocationEntityClass,
    @Context() { loaders }: LoaderType<LocationEntityClass>,
  ): Promise<LocationDto[]> {
    return loaders.batchMany.load({
      __entity: this.entities.location,
      __from: { parentId: id },
      __conditions: (qb) => qb.orderBy('entity."key"', 'ASC'),
    });
  }
}
