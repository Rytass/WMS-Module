import { Injectable } from '@nestjs/common';
import { Args, Mutation } from '@nestjs/graphql';
import { StockService, TransferVendorOrderService } from '@rytass/wms-module-core';
import { TransferVendorOrderDto } from '../dto/transfer-vendor-order.dto';
import {
  CreateTransferVendorOrderArgs,
  UpdateTransferVendorOrderArgs,
} from '../inputs/create-transfer-vendor-order.args';
import { ReturnTransferVendorOrderArgs } from '../inputs/return-transfer-vendor-order.args';
import { WmsOperation } from '../auth';
import { WmsMutationEvent } from '../events';

@Injectable()
export class TransferVendorOrderMutation {
  constructor(
    private readonly transferVendorOrderService: TransferVendorOrderService,
    private readonly stockService: StockService,
  ) {}

  @Mutation(() => TransferVendorOrderDto)
  @WmsOperation({ resource: 'transfer-vendor-order', action: 'create' })
  @WmsMutationEvent({ event: 'transfer-vendor-order.created' })
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
  @WmsOperation({ resource: 'transfer-vendor-order', action: 'update' })
  @WmsMutationEvent({ event: 'transfer-vendor-order.updated' })
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
  @WmsOperation({ resource: 'transfer-vendor-order', action: 'return' })
  @WmsMutationEvent({ event: 'transfer-vendor-order.returned' })
  async returnTransferVendorOrder(
    @Args('items', { type: () => [ReturnTransferVendorOrderArgs] })
    args: ReturnTransferVendorOrderArgs[],
  ): Promise<boolean> {
    return this.transferVendorOrderService
      .returnTransferVendorOrder(
        args.map(({ aggregatedKey, ...item }) => {
          const keys = this.stockService.destructAggregateKey(aggregatedKey);
          return {
            ...item,
            ...keys,
          };
        }),
      )
      .then(() => true);
  }
}
