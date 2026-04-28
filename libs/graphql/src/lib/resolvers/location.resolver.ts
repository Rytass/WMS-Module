import { Context, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { LocationDto } from '../dto/location.dto';
import { MapDataDto } from '../dto/warehouse-map.dto';
import { type LoaderType } from '../helpers';
import { WarehouseMapEntity } from '@rytass/wms-base-nestjs-module/models/warehouse-map.entity';
import { LocationEntityClass } from '@wms-module/core';

@Resolver(() => LocationDto)
export class LocationResolver {
  @ResolveField(() => MapDataDto, { nullable: true })
  async mapData(
    @Parent() { id }: LocationDto,
    @Context() { loaders }: LoaderType<WarehouseMapEntity>,
  ): Promise<MapDataDto | null> {
    const map = await loaders.batchSingle.load({
      __entity: WarehouseMapEntity,
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
      __entity: LocationEntityClass,
      __from: { id: parentId },
    });
  }

  @ResolveField(() => [LocationDto])
  children(@Parent() { children }: LocationEntityClass) {
    return children;
  }
}
