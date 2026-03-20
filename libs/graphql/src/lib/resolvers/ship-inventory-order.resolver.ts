import { Context, Int, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import {
  LoaderDto,
  MaterialDto,
  ShipInventoryOrderDto,
  ShipInventoryOrderItemDto,
} from '../dto';
import {
  LoadersEntityClass,
  LocationEntityClass,
  MaterialEntityClass,
  ShipInventoryOrderChangeEntityClass,
  ShipInventoryOrderEntityClass,
  ShipInventoryOrderItemEntityClass,
  ShipInventoryOrderReferenceEntityClass,
} from '@wms-module/core';
import { type LoaderType } from '../helpers';
import { BatchDto } from '../dto/batch.dto';
import { BatchEntity } from '@rytass/wms-base-nestjs-module';
import { LocationDto } from '../dto/location.dto';
import { ShipInventoryOrderReferenceDto } from '../dto/ship-inventory-order-reference.dto';

@Resolver(() => ShipInventoryOrderDto)
export class ShipInventoryOrderResolver {
  @ResolveField(() => [ShipInventoryOrderItemDto])
  items(
    @Parent() { id }: ShipInventoryOrderEntityClass,
    @Context() { loaders }: LoaderType<ShipInventoryOrderItemEntityClass>,
  ): Promise<ShipInventoryOrderItemDto[]> {
    return loaders.batchMany.load({
      __entity: ShipInventoryOrderItemEntityClass,
      __from: { orderId: id },
    });
  }

  @ResolveField(() => [ShipInventoryOrderReferenceDto])
  references(
    @Parent() { id }: ShipInventoryOrderEntityClass,
    @Context() { loaders }: LoaderType<ShipInventoryOrderReferenceEntityClass>,
  ): Promise<ShipInventoryOrderReferenceDto[]> {
    return loaders.batchMany.load({
      __entity: ShipInventoryOrderReferenceEntityClass,
      __from: { orderId: id },
      __conditions: (qb) => qb.orderBy('entity."serialId"', 'ASC'),
    });
  }
}

@Resolver(() => ShipInventoryOrderItemDto)
export class ShipInventoryOrderItemResolver {
  @ResolveField(() => MaterialDto)
  material(
    @Parent() { materialId }: ShipInventoryOrderItemEntityClass,
    @Context() { loaders }: LoaderType<MaterialEntityClass>,
  ): Promise<MaterialDto> {
    return loaders.batchSingle.load({
      __entity: MaterialEntityClass,
      __from: { id: materialId },
    });
  }

  @ResolveField(() => BatchDto, { nullable: true })
  async batch(
    @Parent() { batchId }: ShipInventoryOrderItemEntityClass,
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
    @Parent() { locationId }: ShipInventoryOrderItemEntityClass,
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
    @Parent() { loaderId }: ShipInventoryOrderItemEntityClass,
    @Context() { loaders }: LoaderType<LoadersEntityClass>,
  ): Promise<LoaderDto | null> {
    if (!loaderId) return null;
    return loaders.batchSingle.load({
      __entity: LoadersEntityClass,
      __from: { id: loaderId },
    });
  }

  @ResolveField(() => Int)
  async shippedQuantity(
    @Parent() { id }: ShipInventoryOrderItemEntityClass,
    @Context() { loaders }: LoaderType<ShipInventoryOrderChangeEntityClass>,
  ): Promise<number> {
    const changes = await loaders.batchMany.load({
      __entity: ShipInventoryOrderChangeEntityClass,
      __from: { itemId: id },
    });

    return changes.reduce((acc, { quantityChanged }) => {
      acc += quantityChanged;

      return acc;
    }, 0);
  }
}

@Resolver(() => ShipInventoryOrderReferenceDto)
export class ShipInventoryOrderReferenceResolver {
  @ResolveField(() => Int)
  async shippedQuantity(
    @Parent() { orderId, serialId }: ShipInventoryOrderReferenceEntityClass,
    @Context() { loaders }: LoaderType<ShipInventoryOrderItemEntityClass>,
  ): Promise<number> {
    const items = await loaders.batchMany.load({
      __entity: ShipInventoryOrderItemEntityClass,
      __from: { orderId, serialId },
      __conditions: (qb) => qb.leftJoinAndSelect('entity.changes', 'changes'),
    });
    const changes = items.flatMap((item) => item.changes);

    return changes.reduce((acc, { quantityChanged }) => {
      acc += quantityChanged;

      return acc;
    }, 0);
  }

  @ResolveField(() => MaterialDto)
  material(
    @Parent() { materialId }: ShipInventoryOrderReferenceEntityClass,
    @Context() { loaders }: LoaderType<MaterialEntityClass>,
  ): Promise<MaterialDto> {
    return loaders.batchSingle.load({
      __entity: MaterialEntityClass,
      __from: { id: materialId },
    });
  }

  @ResolveField(() => BatchDto, { nullable: true })
  async batch(
    @Parent() { batchId }: ShipInventoryOrderReferenceEntityClass,
    @Context() { loaders }: LoaderType<BatchEntity>,
  ): Promise<BatchDto | null> {
    if (!batchId) return null;
    return loaders.batchSingle.load({
      __entity: BatchEntity,
      __from: { id: batchId },
    });
  }

  @ResolveField(() => [ShipInventoryOrderItemDto])
  async items(
    @Parent() { orderId, serialId }: ShipInventoryOrderReferenceEntityClass,
    @Context() { loaders }: LoaderType<ShipInventoryOrderItemEntityClass>,
  ): Promise<ShipInventoryOrderItemDto[]> {
    return loaders.batchMany.load({
      __entity: ShipInventoryOrderItemEntityClass,
      __from: { orderId, serialId },
    });
  }
}
