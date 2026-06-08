import { Injectable } from '@nestjs/common';
import { Args, Mutation } from '@nestjs/graphql';
import { AllocateInventoryOrderService, StockService } from '@rytass/wms-module-core';
import { AllocateInventoryOrderDto } from '../dto/allocate-inventory-order.dto';
import {
  CreateAllocateInventoryOrderArgs,
  UpdateAllocateInventoryOrderArgs,
} from '../inputs/create-allocate-inventory-order.args';
import { DeallocateOrderArgs } from '../inputs/deallocate-order.args';
import { WmsOperation } from '../auth';

@Injectable()
export class AllocateInventoryOrderMutation {
  constructor(
    private readonly allocateInventoryOrderService: AllocateInventoryOrderService,
    private readonly stockService: StockService,
  ) {}

  @Mutation(() => AllocateInventoryOrderDto)
  @WmsOperation({ resource: 'allocate-inventory-order', action: 'create' })
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
  @WmsOperation({ resource: 'allocate-inventory-order', action: 'update' })
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
  @WmsOperation({ resource: 'allocate-inventory-order', action: 'deallocate' })
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
