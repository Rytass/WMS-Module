import { Context, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ReceiveInventoryOrderDto, ReceiveInventoryOrderItemDto } from '../dto';
import { type LoaderType } from '../helpers';
import { ReceiveInventoryOrderItemEntityClass } from '@wms-module/core';

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
