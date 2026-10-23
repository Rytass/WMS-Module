import { Injectable } from '@nestjs/common';
import { Args, Mutation } from '@nestjs/graphql';
import { HoldInventoryOrderService, StockService } from '@rytass/wms-module-core';
import { HoldInventoryOrderDto } from '../dto/hold-inventory-order.dto';
import {
  CreateHoldInventoryOrderArgs,
  UpdateHoldInventoryOrderArgs,
} from '../inputs/create-hold-inventory-order.args';
import { ReleaseOrderArgs } from '../inputs/release-order.args';
import { WmsOperation } from '../auth';
import { WmsMutationEvent } from '../events';

@Injectable()
export class HoldInventoryOrderMutation {
  constructor(
    private readonly holdInventoryOrderService: HoldInventoryOrderService,
    private readonly stockService: StockService,
  ) {}

  @Mutation(() => HoldInventoryOrderDto)
  @WmsOperation({ resource: 'hold-inventory-order', action: 'create' })
  @WmsMutationEvent({ event: 'hold-inventory-order.created' })
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
  @WmsOperation({ resource: 'hold-inventory-order', action: 'update' })
  @WmsMutationEvent({ event: 'hold-inventory-order.updated' })
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
  @WmsOperation({ resource: 'hold-inventory-order', action: 'release' })
  @WmsMutationEvent({ event: 'hold-inventory-order.released' })
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
