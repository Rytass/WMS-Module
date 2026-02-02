import { Injectable } from '@nestjs/common';
import { Args, Mutation } from '@nestjs/graphql';
import { StockService, TransferOrderService } from '@wms-module/core';
import { TransferOrderDto } from '../dto/transfer-order';
import { CreateTransferOrderArgs } from '../inputs/create-transfer-order.args';

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
      items: args.items.map(({ id, ...item }) => {
        console.log({ id });
        const keys = this.stockService.destructAggregateKey(id);
        return {
          ...item,
          ...keys,
        };
      }),
    });
  }
}
