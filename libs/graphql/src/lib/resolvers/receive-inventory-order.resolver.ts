import { Context, Int, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import {
  LoaderDto,
  MaterialDto,
  ReceiveInventoryOrderDto,
  ReceiveInventoryOrderItemDto,
} from '../dto';
import { type LoaderType } from '../helpers';
import {
  BatchEntityClass,
  BatchGroupEntityClass,
  LoadersEntityClass,
  LocationEntityClass,
  MaterialEntity,
  MaterialEntityClass,
  ReceiveInventoryOrderChangeEntityClass,
  ReceiveInventoryOrderItemEntityClass,
  WmsEntities,
} from '@rytass/wms-module-core';
import { BatchDto } from '../dto/batch.dto';
import { LocationDto } from '../dto/location.dto';

@Resolver(() => ReceiveInventoryOrderDto)
export class ReceiveInventoryOrderResolver {
  @ResolveField(() => [ReceiveInventoryOrderItemDto])
  items(
    @Parent() { id }: ReceiveInventoryOrderDto,
    @Context() { loaders }: LoaderType<ReceiveInventoryOrderItemEntityClass>,
  ): Promise<ReceiveInventoryOrderItemDto[]> {
    return loaders.batchMany.load({
      __entity: ReceiveInventoryOrderItemEntityClass,
      __from: { orderId: id },
      __conditions: (qb) => qb.orderBy('entity."serialId"', 'ASC'),
    });
  }
}

@Resolver(() => ReceiveInventoryOrderItemDto)
export class ReceiveInventoryOrderItemResolver {
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
    @Parent() { materialId }: ReceiveInventoryOrderItemEntityClass,
    @Context() { loaders }: LoaderType<MaterialEntityClass>,
  ): Promise<MaterialDto> {
    return loaders.batchSingle.load({
      __entity: this.entities.material,
      __from: { id: materialId },
    });
  }

  @ResolveField(() => BatchDto, { nullable: true })
  async batch(
    @Parent() { batchId }: ReceiveInventoryOrderItemEntityClass,
    @Context() { loaders }: LoaderType<BatchEntityClass>,
  ): Promise<BatchDto | null> {
    if (!batchId) return null;
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
  async location(
    @Parent() { locationId }: ReceiveInventoryOrderItemEntityClass,
    @Context() { loaders }: LoaderType<LocationEntityClass>,
  ): Promise<LocationDto | null> {
    if (!locationId) return null;
    return loaders.batchSingle.load({
      __entity: this.entities.location,
      __from: { id: locationId },
    });
  }

  @ResolveField(() => LoaderDto, { nullable: true })
  async loader(
    @Parent() { loaderId }: ReceiveInventoryOrderItemEntityClass,
    @Context() { loaders }: LoaderType<LoadersEntityClass>,
  ): Promise<LoaderDto | null> {
    if (!loaderId) return null;
    return loaders.batchSingle.load({
      __entity: LoadersEntityClass,
      __from: { id: loaderId },
    });
  }

  @ResolveField(() => Int)
  async receivedQuantity(
    @Parent() { id }: ReceiveInventoryOrderItemEntityClass,
    @Context() { loaders }: LoaderType<ReceiveInventoryOrderChangeEntityClass>,
  ): Promise<number> {
    const changes = await loaders.batchMany.load({
      __entity: ReceiveInventoryOrderChangeEntityClass,
      __from: { itemId: id },
    });
    return changes.reduce((acc, { quantityChanged }) => {
      return acc + Number(quantityChanged);
    }, 0);
  }
}
