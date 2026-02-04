import { Injectable } from '@nestjs/common';
import { Args, Mutation } from '@nestjs/graphql';
import { StockService, TransferOrderService } from '@wms-module/core';
import { TransferOrderDto } from '../dto/transfer-order.dto';
import {
  CreateTransferOrderArgs,
  UpdateTransferOrderArgs,
} from '../inputs/create-transfer-order.args';
import { TransferOrderArgs } from '../inputs/transfer-order.args';

@Injectable()
export class TransferOrderMutation {
  constructor(
    private readonly transferOrderService: TransferOrderService,
    private readonly stockService: StockService,
  ) {}

  @Mutation(() => TransferOrderDto)
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
  async transfer(
    @Args('items', { type: () => [TransferOrderArgs] })
    args: TransferOrderArgs[],
  ) {
    return this.transferOrderService.transfer(args);
  }
}
