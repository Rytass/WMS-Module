import { Context, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { MaterialDto, StockDto } from '../dto';
import {
  BatchEntityClass,
  BatchGroupEntityClass,
  LocationEntityClass,
  MaterialEntity,
  MaterialEntityClass,
  StockEntityClass,
  WmsEntities,
} from '@rytass/wms-module-core';
import { type LoaderType } from '../helpers';
import { LocationDto } from '../dto/location.dto';
import { BatchDto } from '../dto/batch.dto';

@Resolver(() => StockDto)
export class StockResolver {
  /**
   * The configured entities, not the built-in classes: `__entity` decides which
   * repository the DataLoader opens, so it has to follow whatever the consumer
   * passed to `WMSBaseModuleOptions`. Loading a built-in class outright filters
   * on its single-table-inheritance discriminator and resolves nothing for an
   * override.
   */
  constructor(private readonly entities: WmsEntities) {}

  @ResolveField(() => MaterialDto)
  material(
    @Parent() { materialId }: StockEntityClass,
    @Context() { loaders }: LoaderType<MaterialEntityClass>,
  ): Promise<MaterialDto> {
    return loaders.batchSingle.load({
      __entity: this.entities.material,
      __from: { id: materialId },
    });
  }

  @ResolveField(() => LocationDto)
  location(
    @Parent() { locationId }: StockEntityClass,
    @Context() { loaders }: LoaderType<LocationEntityClass>,
  ): Promise<LocationDto> {
    return loaders.batchSingle.load({
      __entity: this.entities.location,
      __from: { id: locationId },
    });
  }

  @ResolveField(() => BatchDto)
  async batch(
    @Parent() { batchId }: StockEntityClass,
    @Context() { loaders }: LoaderType<BatchEntityClass>,
  ): Promise<BatchDto | null> {
    const { groupId } = await loaders.batchSingle.load({
      __entity: this.entities.batch,
      __from: { id: batchId },
    });

    return loaders.batchSingle.load({
      __entity: BatchGroupEntityClass,
      __from: { id: groupId },
    });
  }
}
