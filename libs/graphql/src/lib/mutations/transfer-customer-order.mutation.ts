import { Injectable } from '@nestjs/common';
import { Args, Mutation } from '@nestjs/graphql';
import { StockService, TransferCustomerOrderService } from '@rytass/wms-module-core';
import { TransferCustomerOrderDto } from '../dto/transfer-customer-order.dto';
import {
  CreateTransferCustomerOrderArgs,
  UpdateTransferCustomerOrderArgs,
} from '../inputs/create-transfer-customer-order.args';
import { ReturnTransferCustomerOrderArgs } from '../inputs/return-transfer-customer-order.args';
import { WmsOperation } from '../auth';
import { WmsMutationEvent } from '../events';

@Injectable()
export class TransferCustomerOrderMutation {
  constructor(
    private readonly transferCustomerOrderService: TransferCustomerOrderService,
    private readonly stockService: StockService,
  ) {}

  @Mutation(() => TransferCustomerOrderDto)
  @WmsOperation({ resource: 'transfer-customer-order', action: 'create' })
  @WmsMutationEvent({ event: 'transfer-customer-order.created' })
  async createTransferCustomerOrder(
    @Args() args: CreateTransferCustomerOrderArgs,
  ): Promise<TransferCustomerOrderDto> {
    return this.transferCustomerOrderService.createTransferCustomerOrder({
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

  @Mutation(() => TransferCustomerOrderDto)
  @WmsOperation({ resource: 'transfer-customer-order', action: 'update' })
  @WmsMutationEvent({ event: 'transfer-customer-order.updated' })
  async updateTransferCustomerOrder(
    @Args() args: UpdateTransferCustomerOrderArgs,
  ): Promise<TransferCustomerOrderDto> {
    return this.transferCustomerOrderService.updateTransferCustomerOrder({
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
  @WmsOperation({ resource: 'transfer-customer-order', action: 'return' })
  @WmsMutationEvent({ event: 'transfer-customer-order.returned' })
  async returnTransferCustomerOrder(
    @Args('items', { type: () => [ReturnTransferCustomerOrderArgs] })
    args: ReturnTransferCustomerOrderArgs[],
  ): Promise<boolean> {
    return this.transferCustomerOrderService
      .returnTransferCustomerOrder(
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
