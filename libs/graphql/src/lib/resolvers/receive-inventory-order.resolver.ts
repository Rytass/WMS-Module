import { Context, Int, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import {
  MaterialDto,
  ReceiveInventoryOrderDto,
  ReceiveInventoryOrderItemDto,
} from '../dto';
import { type LoaderType } from '../helpers';
import {
  MaterialEntityClass,
  ReceiveInventoryOrderChangeEntityClass,
  ReceiveInventoryOrderItemEntityClass,
} from '@wms-module/core';

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
    });
  }
}

@Resolver(() => ReceiveInventoryOrderItemDto)
export class ReceiveInventoryOrderItemResolver {
  @ResolveField(() => MaterialDto)
  material(
    @Parent() { materialId }: ReceiveInventoryOrderItemDto,
    @Context() { loaders }: LoaderType<MaterialEntityClass>,
  ): Promise<MaterialDto> {
    return loaders.batchSingle.load({
      __entity: MaterialEntityClass,
      __from: { id: materialId },
    });
  }

  @ResolveField(() => Int)
  async receivedQuantity(
    @Parent() { id }: ReceiveInventoryOrderItemDto,
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
