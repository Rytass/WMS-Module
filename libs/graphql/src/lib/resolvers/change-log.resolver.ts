import { Context, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ChangeLogDto, MaterialDto } from '../dto';
import {
  BatchEntityClass,
  BatchGroupEntityClass,
  LocationEntityClass,
  MaterialEntityClass,
  StockEntityClass,
} from '@rytass/wms-module-core';
import { type LoaderType } from '../helpers';
import { LocationDto } from '../dto/location.dto';
import { BatchDto } from '../dto/batch.dto';

@Resolver(() => ChangeLogDto)
export class ChangeLogResolver {
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
  async batch(
    @Parent() { batchId }: StockEntityClass,
    @Context() { loaders }: LoaderType<BatchEntityClass>,
  ): Promise<BatchDto> {
    const { groupId } = await loaders.batchSingle.load({
      __entity: BatchEntityClass,
      __from: { id: batchId },
    });

    return loaders.batchSingle.load({
      __entity: BatchGroupEntityClass,
      __from: { id: groupId },
    });
  }
}
