import { Inject } from '@nestjs/common';
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
   * Bound to the `MaterialEntity` Symbol, so the DataLoader queries whichever
   * material entity the consumer configured — the built-in `MaterialEntityClass`
   * unless `materialEntity` was passed to `forRoot`/`forRootAsync`. Loading the
   * built-in class outright would filter on its single-table-inheritance
   * discriminator and resolve nothing for a custom entity.
   */
  constructor(
    @Inject(MaterialEntity)
    private readonly materialEntity: new () => MaterialEntityClass,
  ) {}

  @ResolveField(() => MaterialDto)
  material(
    @Parent() { materialId }: ReceiveInventoryOrderItemEntityClass,
    @Context() { loaders }: LoaderType<MaterialEntityClass>,
  ): Promise<MaterialDto> {
    return loaders.batchSingle.load({
      __entity: this.materialEntity,
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
      __entity: BatchEntityClass,
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
      __entity: LocationEntityClass,
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
