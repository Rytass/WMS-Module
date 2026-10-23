import {
  Context,
  Float,
  Parent,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import {
  BatchEntityClass,
  BatchGroupEntityClass,
  ConsumptionChangeKind,
  ConsumptionOrderChangeEntityClass,
  ConsumptionOrderItemEntityClass,
  LoadersEntityClass,
  LocationEntityClass,
  MaterialEntityClass,
  WmsEntities,
} from '@rytass/wms-module-core';
import { ConsumptionOrderDto } from '../dto/consumption-order.dto';
import { ConsumptionOrderItemDto } from '../dto/consumption-order-item.dto';
import { LoaderDto, MaterialDto } from '../dto';
import { BatchDto } from '../dto/batch.dto';
import { LocationDto } from '../dto/location.dto';
import { type LoaderType } from '../helpers';

@Resolver(() => ConsumptionOrderDto)
export class ConsumptionOrderResolver {
  @ResolveField(() => [ConsumptionOrderItemDto])
  items(
    @Parent() { id }: ConsumptionOrderDto,
    @Context() { loaders }: LoaderType<ConsumptionOrderItemEntityClass>,
  ): Promise<ConsumptionOrderItemDto[]> {
    return loaders.batchMany.load({
      __entity: ConsumptionOrderItemEntityClass,
      __from: { orderId: id },
    });
  }
}

@Resolver(() => ConsumptionOrderItemDto)
export class ConsumptionOrderItemResolver {
  /**
   * The configured entities, not the built-in classes: `__entity` decides which
   * repository the DataLoader opens, so it has to follow whatever the consumer
   * passed to `WMSBaseModuleOptions`. Loading a built-in class outright filters
   * on its single-table-inheritance discriminator and resolves nothing for an
   * override.
   */
  constructor(private readonly entities: WmsEntities) {}

  /**
   * How much this line has moved, by kind.
   *
   * Read back from the changes rather than denormalised onto the item: the
   * changes are what the stock ledger and the `stock.*` events agree with, and a
   * counter maintained alongside them is a second answer waiting to disagree.
   */
  private async movedQuantity(
    itemId: string,
    kind: ConsumptionChangeKind,
    loaders: LoaderType<ConsumptionOrderChangeEntityClass>['loaders'],
  ): Promise<number> {
    const changes = await loaders.batchMany.load({
      __entity: ConsumptionOrderChangeEntityClass,
      __from: { itemId },
    });

    return changes
      .filter((change) => change.kind === kind)
      .reduce(
        (total, { quantityChanged }) =>
          total + Math.abs(Number(quantityChanged)),
        0,
      );
  }

  @ResolveField(() => MaterialDto)
  material(
    @Parent() { materialId }: ConsumptionOrderItemEntityClass,
    @Context() { loaders }: LoaderType<MaterialEntityClass>,
  ): Promise<MaterialDto> {
    return loaders.batchSingle.load({
      __entity: this.entities.material,
      __from: { id: materialId },
    });
  }

  @ResolveField(() => BatchDto, { nullable: true })
  async batch(
    @Parent() { batchId }: ConsumptionOrderItemEntityClass,
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
    @Parent() { locationId }: ConsumptionOrderItemEntityClass,
    @Context() { loaders }: LoaderType<LocationEntityClass>,
  ): Promise<LocationDto | null> {
    if (!locationId) return null;

    return loaders.batchSingle.load({
      __entity: this.entities.location,
      __from: { id: locationId },
    });
  }

  @ResolveField(() => LocationDto, { nullable: true })
  async targetLocation(
    @Parent() { targetLocationId }: ConsumptionOrderItemEntityClass,
    @Context() { loaders }: LoaderType<LocationEntityClass>,
  ): Promise<LocationDto | null> {
    if (!targetLocationId) return null;

    return loaders.batchSingle.load({
      __entity: this.entities.location,
      __from: { id: targetLocationId },
    });
  }

  @ResolveField(() => LoaderDto, { nullable: true })
  async loader(
    @Parent() { loaderId }: ConsumptionOrderItemEntityClass,
    @Context() { loaders }: LoaderType<LoadersEntityClass>,
  ): Promise<LoaderDto | null> {
    if (!loaderId) return null;

    return loaders.batchSingle.load({
      __entity: LoadersEntityClass,
      __from: { id: loaderId },
    });
  }

  @ResolveField(() => LoaderDto, { nullable: true })
  async targetLoader(
    @Parent() { targetLoaderId }: ConsumptionOrderItemEntityClass,
    @Context() { loaders }: LoaderType<LoadersEntityClass>,
  ): Promise<LoaderDto | null> {
    if (!targetLoaderId) return null;

    return loaders.batchSingle.load({
      __entity: LoadersEntityClass,
      __from: { id: targetLoaderId },
    });
  }

  @ResolveField(() => Float)
  issuedQuantity(
    @Parent() { id }: ConsumptionOrderItemEntityClass,
    @Context() { loaders }: LoaderType<ConsumptionOrderChangeEntityClass>,
  ): Promise<number> {
    return this.movedQuantity(id, ConsumptionChangeKind.ISSUE, loaders);
  }

  @ResolveField(() => Float)
  returnedQuantity(
    @Parent() { id }: ConsumptionOrderItemEntityClass,
    @Context() { loaders }: LoaderType<ConsumptionOrderChangeEntityClass>,
  ): Promise<number> {
    return this.movedQuantity(id, ConsumptionChangeKind.RETURN, loaders);
  }

  @ResolveField(() => Float)
  settledQuantity(
    @Parent() { id }: ConsumptionOrderItemEntityClass,
    @Context() { loaders }: LoaderType<ConsumptionOrderChangeEntityClass>,
  ): Promise<number> {
    return this.movedQuantity(id, ConsumptionChangeKind.SETTLE, loaders);
  }

  /** Issued minus returned minus settled: what the process still holds. */
  @ResolveField(() => Float)
  async outstandingQuantity(
    @Parent() { id }: ConsumptionOrderItemEntityClass,
    @Context() { loaders }: LoaderType<ConsumptionOrderChangeEntityClass>,
  ): Promise<number> {
    const changes = await loaders.batchMany.load({
      __entity: ConsumptionOrderChangeEntityClass,
      __from: { itemId: id },
    });

    // The sign already carries the direction here — an issue is positive, a
    // return and a settlement negative — so the outstanding amount is just the
    // sum, no filtering by kind needed.
    return changes.reduce(
      (total, { quantityChanged }) => total + Number(quantityChanged),
      0,
    );
  }
}
