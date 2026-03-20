import { Context, Int, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import {
  LoaderDto,
  MaterialDto,
  ReceiveInventoryOrderDto,
  ReceiveInventoryOrderItemDto,
} from '../dto';
import { type LoaderType } from '../helpers';
import {
  LoadersEntityClass,
  LocationEntityClass,
  MaterialEntityClass,
  ReceiveInventoryOrderChangeEntityClass,
  ReceiveInventoryOrderItemEntityClass,
} from '@wms-module/core';
import { BatchDto } from '../dto/batch.dto';
import { BatchEntity } from '@rytass/wms-base-nestjs-module';
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
  @ResolveField(() => MaterialDto)
  material(
    @Parent() { materialId }: ReceiveInventoryOrderItemEntityClass,
    @Context() { loaders }: LoaderType<MaterialEntityClass>,
  ): Promise<MaterialDto> {
    return loaders.batchSingle.load({
      __entity: MaterialEntityClass,
      __from: { id: materialId },
    });
  }

  @ResolveField(() => BatchDto, { nullable: true })
  async batch(
    @Parent() { batchId }: ReceiveInventoryOrderItemEntityClass,
    @Context() { loaders }: LoaderType<BatchEntity>,
  ): Promise<BatchDto | null> {
    if (!batchId) return null;
    return loaders.batchSingle.load({
      __entity: BatchEntity,
      __from: { id: batchId },
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
      acc += quantityChanged;

      return acc;
    }, 0);
  }
}
