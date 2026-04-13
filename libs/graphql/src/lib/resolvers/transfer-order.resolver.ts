import { Context, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { TransferOrderDto } from '../dto/transfer-order.dto';
import { TransferOrderItemDto } from '../dto/transfer-order-item.dto';
import { type LoaderType } from '../helpers';
import {
  BatchEntityClass,
  BatchGroupEntityClass,
  LocationEntityClass,
  MaterialEntityClass,
  TransferOrderItemEntityClass,
} from '@wms-module/core';
import { LoaderDto, MaterialDto } from '../dto';
import { BatchDto } from '../dto/batch.dto';
import { LocationDto } from '../dto/location.dto';

@Resolver(() => TransferOrderDto)
export class TransferOrderResolver {
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
  async location(
    @Parent() { id }: TransferOrderDto,
    @Context() { loaders }: LoaderType<TransferOrderItemEntityClass>,
  ): Promise<LocationDto> {
    const [item] = await loaders.batchMany.load({
      __entity: TransferOrderItemEntityClass,
      __from: { orderId: id },
      __conditions: (qb) => qb.leftJoinAndSelect('entity.location', 'location'),
    });

    return item?.location || null;
  }

  @ResolveField(() => LoaderDto, { nullable: true })
  async loader(
    @Parent() { id }: TransferOrderDto,
    @Context() { loaders }: LoaderType<TransferOrderItemEntityClass>,
  ): Promise<LoaderDto | null> {
    const [item] = await loaders.batchMany.load({
      __entity: TransferOrderItemEntityClass,
      __from: { orderId: id },

      __conditions: (qb) => qb.leftJoinAndSelect('entity.loader', 'loader'),
    });

    return item?.loader || null;
  }
}

@Resolver(() => TransferOrderItemDto)
export class TransferOrderItemResolver {
  @ResolveField(() => MaterialDto)
  material(
    @Parent() { materialId }: TransferOrderItemEntityClass,
    @Context() { loaders }: LoaderType<MaterialEntityClass>,
  ): Promise<MaterialDto> {
    return loaders.batchSingle.load({
      __entity: MaterialEntityClass,
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
      __entity: BatchEntityClass,
      __from: { id: batchId },
    });

    return loaders.batchSingle.load({
      __entity: BatchGroupEntityClass,
      __from: { id: groupId },
    });
  }
}
