import {
  Context,
  ID,
  Int,
  Parent,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { TransferOrderDto } from '../dto/transfer-order.dto';
import { TransferOrderItemDto } from '../dto/transfer-order-item.dto';
import { type LoaderType } from '../helpers';
import {
  BatchEntityClass,
  BatchGroupEntityClass,
  LoadersEntityClass,
  LocationEntityClass,
  MaterialEntity,
  MaterialEntityClass,
  TransferOrderChangeEntityClass,
  TransferOrderItemEntityClass,
  WmsEntities,
} from '@rytass/wms-module-core';
import { LoaderDto, MaterialDto } from '../dto';
import { BatchDto } from '../dto/batch.dto';
import { LocationDto } from '../dto/location.dto';

@Resolver(() => TransferOrderDto)
export class TransferOrderResolver {
  /**
   * The configured entities, not the built-in classes: `__entity` decides which
   * repository the DataLoader opens, so it has to follow whatever the consumer
   * passed to `WMSBaseModuleOptions`. Loading a built-in class outright filters
   * on its single-table-inheritance discriminator and resolves nothing for an
   * override.
   */
  constructor(private readonly entities: WmsEntities) {}

  @ResolveField(() => [TransferOrderItemDto])
  items(
    @Parent() { id }: TransferOrderDto,
    @Context() { loaders }: LoaderType<TransferOrderItemEntityClass>,
  ): Promise<TransferOrderItemDto[]> {
    return loaders.batchMany.load({
      __entity: TransferOrderItemEntityClass,
      __from: { orderId: id },
    });
  }

  @ResolveField(() => LocationDto, { nullable: true })
  async targetLocation(
    @Parent() { id }: TransferOrderDto,
    @Context() { loaders }: LoaderType<TransferOrderItemEntityClass>,
    @Context() locationLoader: LoaderType<LocationEntityClass>,
  ): Promise<LocationDto | null> {
    const [item] = await loaders.batchMany.load({
      __entity: TransferOrderItemEntityClass,
      __from: { orderId: id },
    });

    if (!item?.targetLocationId) return null;
    return locationLoader.loaders.batchSingle.load({
      __entity: this.entities.location,
      __from: { id: item.targetLocationId },
    });
  }

  @ResolveField(() => LoaderDto, { nullable: true })
  async targetLoader(
    @Parent() { id }: TransferOrderDto,
    @Context() { loaders }: LoaderType<TransferOrderItemEntityClass>,
    @Context() loaderLoader: LoaderType<LoadersEntityClass>,
  ): Promise<LoaderDto | null> {
    const [item] = await loaders.batchMany.load({
      __entity: TransferOrderItemEntityClass,
      __from: { orderId: id },
    });

    if (!item?.targetLoaderId) return null;
    return loaderLoader.loaders.batchSingle.load({
      __entity: LoadersEntityClass,
      __from: { id: item.targetLoaderId },
    });
  }
}

@Resolver(() => TransferOrderItemDto)
export class TransferOrderItemResolver {
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
    @Parent() { materialId }: TransferOrderItemEntityClass,
    @Context() { loaders }: LoaderType<MaterialEntityClass>,
  ): Promise<MaterialDto> {
    return loaders.batchSingle.load({
      __entity: this.entities.material,
      __from: { id: materialId },
    });
  }

  @ResolveField(() => BatchDto, { nullable: true })
  async batch(
    @Parent() { batchId }: TransferOrderItemEntityClass,
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
    @Parent() { locationId }: TransferOrderItemEntityClass,
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
    @Parent() { loaderId }: TransferOrderItemEntityClass,
    @Context() { loaders }: LoaderType<LoadersEntityClass>,
  ): Promise<LoaderDto | null> {
    if (!loaderId) return null;
    return loaders.batchSingle.load({
      __entity: LoadersEntityClass,
      __from: { id: loaderId },
    });
  }

  @ResolveField(() => ID, { nullable: true })
  async saleId(
    @Parent() { batchId }: TransferOrderItemEntityClass,
    @Context() { loaders }: LoaderType<BatchEntityClass>,
  ): Promise<string | null> {
    if (!batchId) return null;
    return loaders.batchSingle
      .load({
        __entity: this.entities.batch,
        __from: { id: batchId },
      })
      .then((batch) => batch.saleId);
  }

  @ResolveField(() => ID, { nullable: true })
  async saleSerialId(
    @Parent() { batchId }: TransferOrderItemEntityClass,
    @Context() { loaders }: LoaderType<BatchEntityClass>,
  ): Promise<string | null> {
    if (!batchId) return null;
    return loaders.batchSingle
      .load({
        __entity: this.entities.batch,
        __from: { id: batchId },
      })
      .then((batch) => batch.saleSerialId);
  }

  @ResolveField(() => Int)
  async transferredQuantity(
    @Parent() { id }: TransferOrderItemEntityClass,
    @Context() { loaders }: LoaderType<TransferOrderChangeEntityClass>,
  ): Promise<number> {
    const changes = await loaders.batchMany.load({
      __entity: TransferOrderChangeEntityClass,
      __from: { itemId: id },
    });

    return changes.reduce((acc, { quantityChanged }) => {
      const qty = Number(quantityChanged);
      return qty < 0 ? acc + Math.abs(qty) : acc;
    }, 0);
  }
}
