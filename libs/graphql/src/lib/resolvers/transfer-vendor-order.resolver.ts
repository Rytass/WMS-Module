import { Context, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { TransferVendorOrderDto } from '../dto/transfer-vendor-order.dto';
import { TransferVendorOrderItemDto } from '../dto/transfer-vendor-order-item.dto';
import {
  TransferVendorOrderEntityClass,
  TransferVendorOrderItemEntityClass,
} from '@wms-module/core';
import { type LoaderType } from '../helpers';

@Resolver(() => TransferVendorOrderDto)
export class TransferVendorOrderResolver {
  @ResolveField(() => [TransferVendorOrderItemDto])
  items(
    @Parent() { id }: TransferVendorOrderEntityClass,
    @Context() { loaders }: LoaderType<TransferVendorOrderItemEntityClass>,
  ): Promise<TransferVendorOrderItemDto[]> {
    return loaders.batchMany.load({
      __entity: TransferVendorOrderItemEntityClass,
      __from: { orderId: id },
    });
  }
}
