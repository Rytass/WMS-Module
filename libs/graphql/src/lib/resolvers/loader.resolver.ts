import { Context, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { LoaderDto, LoaderTypeDto } from '../dto';
import {
  LoadersEntityClass,
  LoaderTypeEntityClass,
  LocationEntityClass,
} from '@wms-module/core';
import { type LoaderType } from '../helpers';
import { LocationDto } from '../dto/location.dto';

@Resolver(() => LoaderDto)
export class LoaderResolver {
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
}
