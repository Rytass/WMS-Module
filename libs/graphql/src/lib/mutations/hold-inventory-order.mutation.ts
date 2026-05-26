import { Injectable } from '@nestjs/common';
import { Args, Mutation } from '@nestjs/graphql';
import { HoldInventoryOrderService, StockService } from '@rytass/wms-module-core';
import { HoldInventoryOrderDto } from '../dto/hold-inventory-order.dto';
import {
  CreateHoldInventoryOrderArgs,
  UpdateHoldInventoryOrderArgs,
} from '../inputs/create-hold-inventory-order.args';
import { ReleaseOrderArgs } from '../inputs/release-order.args';

@Injectable()
export class HoldInventoryOrderMutation {
  constructor(
    private readonly holdInventoryOrderService: HoldInventoryOrderService,
    private readonly stockService: StockService,
  ) {}

  @Mutation(() => HoldInventoryOrderDto)
  async createHoldInventoryOrder(
    @Args() args: CreateHoldInventoryOrderArgs,
  ): Promise<HoldInventoryOrderDto> {
    return this.holdInventoryOrderService.createHoldInventoryOrder({
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

  @Mutation(() => HoldInventoryOrderDto)
  async updateHoldInventoryOrder(
    @Args() args: UpdateHoldInventoryOrderArgs,
  ): Promise<HoldInventoryOrderDto> {
    return this.holdInventoryOrderService.updateHoldInventoryOrder({
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
  async release(
    @Args('items', { type: () => [ReleaseOrderArgs] }) args: ReleaseOrderArgs[],
  ) {
    return this.holdInventoryOrderService
      .release(
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
