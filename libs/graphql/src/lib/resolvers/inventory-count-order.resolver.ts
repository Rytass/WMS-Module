import { Context, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import {
  BatchEntityClass,
  BatchGroupEntityClass,
  InventoryCountOrderItemEntityClass,
  InventoryCountOrderLocationEntityClass,
  LoadersEntityClass,
  LocationEntityClass,
  MaterialEntityClass,
  WmsEntities,
} from '@rytass/wms-module-core';
import {
  InventoryCountOrderDto,
  InventoryCountOrderItemDto,
} from '../dto/inventory-count-order.dto';
import { BatchDto } from '../dto/batch.dto';
import { LoaderDto } from '../dto/loader.dto';
import { LocationDto } from '../dto/location.dto';
import { MaterialDto } from '../dto/material.dto';
import { type LoaderType } from '../helpers';

@Resolver(() => InventoryCountOrderDto)
export class InventoryCountOrderResolver {
  constructor(private readonly entities: WmsEntities) {}

  @ResolveField(() => [InventoryCountOrderItemDto])
  items(
    @Parent() { id }: InventoryCountOrderDto,
    @Context() { loaders }: LoaderType<InventoryCountOrderItemEntityClass>,
  ): Promise<InventoryCountOrderItemDto[]> {
    return loaders.batchMany.load({
      __entity: InventoryCountOrderItemEntityClass,
      __from: { orderId: id },
    });
  }

  /**
   * The locations the user picked.
   *
   * Only the roots: the scope table also holds every descendant the backend
   * expanded into, and listing a whole aisle's shelves as chips would bury the
   * one thing the operator actually chose. The expansion still exists in the
   * database — it is what the lock reads — it just is not this field.
   */
  @ResolveField(() => [LocationDto])
  async locations(
    @Parent() { id }: InventoryCountOrderDto,
    @Context()
    { loaders }: LoaderType<InventoryCountOrderLocationEntityClass>,
  ): Promise<LocationDto[]> {
    const scope = (await loaders.batchMany.load({
      __entity: InventoryCountOrderLocationEntityClass,
      __from: { orderId: id },
    })) as unknown as InventoryCountOrderLocationEntityClass[];

    // The join rows carry `locationId`, not a loaded `location` relation, so
    // each one has to go back through the location DataLoader. Returning
    // `row.location` directly yields `undefined`, and the non-nullable list then
    // fails the whole query with "Cannot return null for non-nullable field".
    return Promise.all(
      scope
        .filter(({ isRoot }) => isRoot)
        .map(({ locationId }) =>
          loaders.batchSingle.load({
            __entity: this.entities.location,
            __from: { id: locationId },
          }),
        ),
    ) as unknown as Promise<LocationDto[]>;
  }
}

@Resolver(() => InventoryCountOrderItemDto)
export class InventoryCountOrderItemResolver {
  /**
   * The configured entities, not the built-in classes: `__entity` decides which
   * repository the DataLoader opens, so it has to follow whatever the consumer
   * passed to `WMSBaseModuleOptions`.
   */
  constructor(private readonly entities: WmsEntities) {}

  @ResolveField(() => MaterialDto)
  material(
    @Parent() { materialId }: InventoryCountOrderItemDto,
    @Context() { loaders }: LoaderType<MaterialEntityClass>,
  ): Promise<MaterialDto> {
    return loaders.batchSingle.load({
      __entity: this.entities.material,
      __from: { id: materialId },
    });
  }

  @ResolveField(() => BatchDto)
  async batch(
    @Parent() { batchId }: InventoryCountOrderItemDto,
    @Context() { loaders }: LoaderType<BatchEntityClass>,
  ): Promise<BatchDto> {
    const { groupId } = await loaders.batchSingle.load({
      __entity: this.entities.batch,
      __from: { id: batchId },
    });

    return loaders.batchSingle.load({
      __entity: BatchGroupEntityClass,
      __from: { id: groupId },
    });
  }

  @ResolveField(() => LocationDto, { nullable: true })
  location(
    @Parent() { locationId }: InventoryCountOrderItemDto,
    @Context() { loaders }: LoaderType<LocationEntityClass>,
  ): Promise<LocationDto> | null {
    if (!locationId) {
      return null;
    }

    return loaders.batchSingle.load({
      __entity: this.entities.location,
      __from: { id: locationId },
    });
  }

  @ResolveField(() => LoaderDto, { nullable: true })
  loader(
    @Parent() { loaderId }: InventoryCountOrderItemDto,
    @Context() { loaders }: LoaderType<LoadersEntityClass>,
  ): Promise<LoaderDto> | null {
    if (!loaderId) {
      return null;
    }

    return loaders.batchSingle.load({
      __entity: LoadersEntityClass,
      __from: { id: loaderId },
    });
  }
}
