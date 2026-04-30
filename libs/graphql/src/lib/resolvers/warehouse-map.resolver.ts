import { Context, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { LocationDto } from '../dto/location.dto';
import { type LoaderType } from '../helpers';
import { LocationEntityClass } from '@wms-module/core';
import { MapRangeDto } from '../dto/warehouse-map.dto';

@Resolver(() => MapRangeDto)
export class MapRangeUnionResolver {
  @ResolveField(() => LocationDto, { nullable: true })
  location(
    @Parent() { id }: MapRangeDto,
    @Context() { loaders }: LoaderType<LocationEntityClass>,
  ) {
    if (!id) return null;
    return loaders.batchSingle.load({
      __entity: LocationEntityClass,
      __from: { id },
    });
  }
}
