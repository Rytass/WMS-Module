import { Injectable } from '@nestjs/common';
import { Args, Mutation } from '@nestjs/graphql';
import {
  StockService,
  TransferVendorOrderService,
} from '@wms-module/core';
import { TransferVendorOrderDto } from '../dto/transfer-vendor-order.dto';
import {
  CreateTransferVendorOrderArgs,
  UpdateTransferVendorOrderArgs,
} from '../inputs/create-transfer-vendor-order.args';
import { ReturnTransferVendorOrderArgs } from '../inputs/return-transfer-vendor-order.args';

@Injectable()
export class TransferVendorOrderMutation {
  constructor(
    private readonly transferVendorOrderService: TransferVendorOrderService,
    private readonly stockService: StockService,
  ) {}

  @Mutation(() => TransferVendorOrderDto)
  async createTransferVendorOrder(
    @Args() args: CreateTransferVendorOrderArgs,
  ): Promise<TransferVendorOrderDto> {
    return this.transferVendorOrderService.createTransferVendorOrder({
      ...args,
      items: args.items.map(({ aggregatedKey, ...item }) => {
        const keys = this.stockService.destructAggregateKey(aggregatedKey);
        return {
          ...item,
          ...keys,
        };
      }),
    });
  }

  @Mutation(() => TransferVendorOrderDto)
  async updateTransferVendorOrder(
    @Args() args: UpdateTransferVendorOrderArgs,
  ): Promise<TransferVendorOrderDto> {
    return this.transferVendorOrderService.updateTransferVendorOrder({
      ...args,
      items: args?.items?.map(({ aggregatedKey, ...item }) => {
        const keys = aggregatedKey
          ? this.stockService.destructAggregateKey(aggregatedKey)
          : {};
        return {
          ...item,
          ...keys,
        };
      }),
    });
  }

  @Mutation(() => Boolean)
  async returnTransferVendorOrder(
    @Args('items', { type: () => [ReturnTransferVendorOrderArgs] })
    args: ReturnTransferVendorOrderArgs[],
  ) {
    return this.transferVendorOrderService.returnTransferVendorOrder(args);
  }
}
