import { Context, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { HoldInventoryOrderDto } from '../dto/hold-inventory-order.dto';
import { HoldInventoryOrderItemDto } from '../dto/hold-inventory-order-item.dto';
import { type LoaderType } from '../helpers';
import { HoldInventoryOrderItemEntityClass } from '@rytass/wms-module-core';

@Resolver(() => HoldInventoryOrderDto)
export class HoldInventoryOrderResolver {
  @ResolveField(() => [HoldInventoryOrderItemDto])
  items(
    @Parent() { id }: HoldInventoryOrderDto,
    @Context() { loaders }: LoaderType<HoldInventoryOrderItemEntityClass>,
  ): Promise<HoldInventoryOrderItemDto[]> {
    return loaders.batchMany.load({
      __entity: HoldInventoryOrderItemEntityClass,
      __from: { orderId: id },
    });
  }
}
