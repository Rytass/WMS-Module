import { Context, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { TransferOrderDto } from '../dto/transfer-order.dto';
import { TransferOrderItemDto } from '../dto/transfer-order-item.dto';
import { type LoaderType } from '../helpers';
import { TransferOrderItemEntityClass } from '@wms-module/core';

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
}
