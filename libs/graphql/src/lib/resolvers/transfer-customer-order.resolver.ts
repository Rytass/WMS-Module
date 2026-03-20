import { Context, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { TransferCustomerOrderDto } from '../dto/transfer-customer-order.dto';
import { TransferCustomerOrderItemDto } from '../dto/transfer-customer-order-item.dto';
import {
  TransferCustomerOrderEntityClass,
  TransferCustomerOrderItemEntityClass,
} from '@wms-module/core';
import { type LoaderType } from '../helpers';

@Resolver(() => TransferCustomerOrderDto)
export class TransferCustomerOrderResolver {
  @ResolveField(() => [TransferCustomerOrderItemDto])
  items(
    @Parent() { id }: TransferCustomerOrderEntityClass,
    @Context() { loaders }: LoaderType<TransferCustomerOrderItemEntityClass>,
  ): Promise<TransferCustomerOrderItemDto[]> {
    return loaders.batchMany.load({
      __entity: TransferCustomerOrderItemEntityClass,
      __from: { orderId: id },
    });
  }
}
