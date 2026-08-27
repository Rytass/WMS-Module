import {
  Context,
  ID,
  Int,
  Parent,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import {
  LoaderDto,
  MaterialDto,
  ShipInventoryOrderDto,
  ShipInventoryOrderItemDto,
} from '../dto';
import {
  BatchEntityClass,
  BatchGroupEntityClass,
  LoadersEntityClass,
  LocationEntityClass,
  MaterialEntity,
  MaterialEntityClass,
  ShipInventoryOrderChangeEntityClass,
  ShipInventoryOrderEntityClass,
  ShipInventoryOrderItemEntityClass,
  ShipInventoryOrderReferenceEntityClass,
  WmsEntities,
} from '@rytass/wms-module-core';
import { type LoaderType } from '../helpers';
import { BatchDto } from '../dto/batch.dto';
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
    @Parent() { materialId }: ShipInventoryOrderItemEntityClass,
    @Context() { loaders }: LoaderType<MaterialEntityClass>,
  ): Promise<MaterialDto> {
    return loaders.batchSingle.load({
      __entity: this.entities.material,
      __from: { id: materialId },
    });
  }

  @ResolveField(() => BatchDto, { nullable: true })
  async batch(
    @Parent() { batchId }: ShipInventoryOrderItemEntityClass,
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

  @ResolveField(() => ID, { nullable: true })
  async saleId(
    @Parent() { batchId }: ShipInventoryOrderItemEntityClass,
    @Context() { loaders }: LoaderType<BatchEntityClass>,
  ): Promise<string | null> {
    if (!batchId) return null;
    const { groupId } = await loaders.batchSingle.load({
      __entity: this.entities.batch,
      __from: { id: batchId },
    });

    return loaders.batchSingle
      .load({
        __entity: BatchGroupEntityClass,
        __from: { id: groupId },
      })
      .then(({ saleId }) => saleId);
  }

  @ResolveField(() => ID, { nullable: true })
  async saleSerialId(
    @Parent() { batchId }: ShipInventoryOrderItemEntityClass,
    @Context() { loaders }: LoaderType<BatchEntityClass>,
  ): Promise<string | null> {
    if (!batchId) return null;
    const { groupId } = await loaders.batchSingle.load({
      __entity: this.entities.batch,
      __from: { id: batchId },
    });

    return loaders.batchSingle
      .load({
        __entity: BatchGroupEntityClass,
        __from: { id: groupId },
      })
      .then(({ saleSerialId }) => saleSerialId);
  }

  @ResolveField(() => LocationDto, { nullable: true })
  async location(
    @Parent() { locationId }: ShipInventoryOrderItemEntityClass,
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
      const qty = Number(quantityChanged);
      return qty < 0 ? acc + Math.abs(qty) : acc;
    }, 0);
  }
}

@Resolver(() => ShipInventoryOrderReferenceDto)
export class ShipInventoryOrderReferenceResolver {
  /**
   * The configured entities, not the built-in classes: `__entity` decides which
   * repository the DataLoader opens, so it has to follow whatever the consumer
   * passed to `WMSBaseModuleOptions`. Loading a built-in class outright filters
   * on its single-table-inheritance discriminator and resolves nothing for an
   * override.
   */
  constructor(private readonly entities: WmsEntities) {}

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
      const qty = Number(quantityChanged);
      return qty < 0 ? acc + Math.abs(qty) : acc;
    }, 0);
  }

  @ResolveField(() => MaterialDto)
  material(
    @Parent() { materialId }: ShipInventoryOrderReferenceEntityClass,
    @Context() { loaders }: LoaderType<MaterialEntityClass>,
  ): Promise<MaterialDto> {
    return loaders.batchSingle.load({
      __entity: this.entities.material,
      __from: { id: materialId },
    });
  }

  @ResolveField(() => BatchDto, { nullable: true })
  async batch(
    @Parent() { batchId }: ShipInventoryOrderReferenceEntityClass,
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
