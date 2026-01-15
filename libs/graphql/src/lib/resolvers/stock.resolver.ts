import { Context, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { MaterialDto, StockDto } from '../dto';
import {
  LocationEntityClass,
  MaterialEntityClass,
  StockEntityClass,
} from '@wms-module/core';
import { type LoaderType } from '../helpers';
import { LocationDto } from '../dto/location.dto';
import { BatchDto } from '../dto/batch.dto';
import { BatchEntity } from '@rytass/wms-base-nestjs-module';

@Resolver(() => StockDto)
export class StockResolver {
  @ResolveField(() => MaterialDto)
  material(
    @Parent() { materialId }: StockEntityClass,
    @Context() { loaders }: LoaderType<MaterialEntityClass>,
  ): Promise<MaterialDto> {
    return loaders.batchSingle.load({
      __entity: MaterialEntityClass,
      __from: { id: materialId },
    });
  }

  @ResolveField(() => LocationDto)
  location(
    @Parent() { locationId }: StockEntityClass,
    @Context() { loaders }: LoaderType<LocationEntityClass>,
  ): Promise<LocationDto> {
    return loaders.batchSingle.load({
      __entity: LocationEntityClass,
      __from: { id: locationId },
    });
  }

  @ResolveField(() => BatchDto)
  batch(
    @Parent() { batchId }: StockEntityClass,
    @Context() { loaders }: LoaderType<BatchEntity>,
  ): Promise<BatchDto> {
    return loaders.batchSingle.load({
      __entity: BatchEntity,
      __from: { id: batchId },
    });
  }
}
