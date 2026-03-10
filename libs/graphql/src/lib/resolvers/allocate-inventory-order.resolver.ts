import { Context, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AllocateInventoryOrderDto } from '../dto/allocate-inventory-order.dto';
import { AllocateInventoryOrderItemDto } from '../dto/allocate-inventory-order-item.dto';
import {
  AllocateInventoryOrderEntityClass,
  AllocateInventoryOrderItemEntityClass,
} from '@wms-module/core';
import { type LoaderType } from '../helpers';

@Resolver(() => AllocateInventoryOrderDto)
export class AllocateInventoryOrderResolver {
  @ResolveField(() => [AllocateInventoryOrderItemDto])
  items(
    @Parent() { id }: AllocateInventoryOrderEntityClass,
    @Context() { loaders }: LoaderType<AllocateInventoryOrderItemEntityClass>,
  ): Promise<AllocateInventoryOrderItemDto[]> {
    return loaders.batchMany.load({
      __entity: AllocateInventoryOrderItemEntityClass,
      __from: { orderId: id },
    });
  }
}
