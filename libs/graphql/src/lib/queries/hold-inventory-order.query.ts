import { Injectable } from '@nestjs/common';
import { Args, Query } from '@nestjs/graphql';
import { HoldInventoryOrderService } from '@rytass/wms-module-core';
import { HoldInventoryOrders } from '../dto/hold-inventory-order.dto';
import { FindHoldInventoryOrderArgs } from '../inputs/find-hold-inventory-order.args';
import { WmsOperation } from '../auth';

@Injectable()
export class HoldInventoryOrderQuery {
  constructor(
    private readonly holdInventoryOrderService: HoldInventoryOrderService,
  ) {}

  @Query(() => HoldInventoryOrders)
  @WmsOperation({ resource: 'hold-inventory-order', action: 'read' })
  async holdInventoryOrders(
    @Args() args: FindHoldInventoryOrderArgs,
  ): Promise<HoldInventoryOrders> {
    const [items, total] = await this.holdInventoryOrderService.findMany(args);
    return { items, total };
  }
}
