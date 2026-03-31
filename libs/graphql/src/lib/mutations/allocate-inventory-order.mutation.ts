import { Injectable } from '@nestjs/common';
import { Args, Mutation } from '@nestjs/graphql';
import { AllocateInventoryOrderService, StockService } from '@wms-module/core';
import { AllocateInventoryOrderDto } from '../dto/allocate-inventory-order.dto';
import {
  CreateAllocateInventoryOrderArgs,
  UpdateAllocateInventoryOrderArgs,
} from '../inputs/create-allocate-inventory-order.args';
import { DeallocateOrderArgs } from '../inputs/deallocate-order.args';

@Injectable()
export class AllocateInventoryOrderMutation {
  constructor(
    private readonly allocateInventoryOrderService: AllocateInventoryOrderService,
    private readonly stockService: StockService,
  ) {}

  @Mutation(() => AllocateInventoryOrderDto)
  async createAllocateInventoryOrder(
    @Args() args: CreateAllocateInventoryOrderArgs,
  ): Promise<AllocateInventoryOrderDto> {
    return this.allocateInventoryOrderService.createAllocateInventoryOrder({
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

  @Mutation(() => AllocateInventoryOrderDto)
  async updateAllocateInventoryOrder(
    @Args() args: UpdateAllocateInventoryOrderArgs,
  ): Promise<AllocateInventoryOrderDto> {
    return this.allocateInventoryOrderService.updateAllocateInventoryOrder({
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
  async deallocate(
    @Args('items', { type: () => [DeallocateOrderArgs] })
    args: DeallocateOrderArgs[],
  ) {
    return this.allocateInventoryOrderService
      .deallocate(
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
