import { Injectable } from '@nestjs/common';
import { Args, Mutation } from '@nestjs/graphql';
import { StockService, TransferOrderService } from '@rytass/wms-module-core';
import { TransferOrderDto } from '../dto/transfer-order.dto';
import {
  CreateTransferOrderArgs,
  UpdateTransferOrderArgs,
} from '../inputs/create-transfer-order.args';
import { TransferOrderArgs } from '../inputs/transfer-order.args';
import { CancelTransferOrderArgs } from '../inputs/cancel-transfer-order.args';
import { WmsOperation } from '../auth';
import { WmsMutationEvent } from '../events';

@Injectable()
export class TransferOrderMutation {
  constructor(
    private readonly transferOrderService: TransferOrderService,
    private readonly stockService: StockService,
  ) {}

  @Mutation(() => TransferOrderDto)
  @WmsOperation({ resource: 'transfer-order', action: 'create' })
  @WmsMutationEvent({ event: 'transfer-order.created' })
  async createTransferOrder(
    @Args() args: CreateTransferOrderArgs,
  ): Promise<TransferOrderDto> {
    return this.transferOrderService.createTransferOrder({
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

  @Mutation(() => TransferOrderDto)
  @WmsOperation({ resource: 'transfer-order', action: 'update' })
  @WmsMutationEvent({ event: 'transfer-order.updated' })
  async updateTransferOrder(
    @Args() args: UpdateTransferOrderArgs,
  ): Promise<TransferOrderDto> {
    return this.transferOrderService.updateTransferOrder({
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
  @WmsOperation({ resource: 'transfer-order', action: 'transfer' })
  @WmsMutationEvent({ event: 'transfer-order.transferred' })
  async transfer(
    @Args('items', { type: () => [TransferOrderArgs] })
    args: TransferOrderArgs[],
  ) {
    return this.transferOrderService.transfer(args);
  }

  @Mutation(() => Boolean)
  @WmsOperation({ resource: 'transfer-order', action: 'cancel' })
  @WmsMutationEvent({ event: 'transfer-order.transfer-cancelled' })
  async cancelTransfer(
    @Args('items', { type: () => [CancelTransferOrderArgs] })
    args: CancelTransferOrderArgs[],
  ) {
    return this.transferOrderService.cancelTransfer(args);
  }
}
