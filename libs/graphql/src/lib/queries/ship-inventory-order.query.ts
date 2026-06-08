import { Injectable } from '@nestjs/common';
import { Args, ID, Query } from '@nestjs/graphql';
import { ShipInventoryOrderService } from '@rytass/wms-module-core';
import { ShipInventoryOrderDto, ShipInventoryOrders } from '../dto';
import { FindShipInventoryOrderArgs } from '../inputs/find-ship-inventory-order.args';
import { WmsOperation } from '../auth';

@Injectable()
export class ShipInventoryOrderQuery {
  constructor(
    private readonly shipInventoryOrderService: ShipInventoryOrderService,
  ) {}

  @Query(() => ShipInventoryOrderDto)
  @WmsOperation({ resource: 'ship-inventory-order', action: 'read' })
  async shipInventoryOrder(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<ShipInventoryOrderDto> {
    return this.shipInventoryOrderService
      .selectQueryBuilder('orders')
      .where('orders.id = :id', { id })
      .getRawOne() as Promise<ShipInventoryOrderDto>;
  }

  @Query(() => ShipInventoryOrders)
  @WmsOperation({ resource: 'ship-inventory-order', action: 'read' })
  async shipInventoryOrders(
    @Args() args: FindShipInventoryOrderArgs,
  ): Promise<ShipInventoryOrders> {
    const [items, total] = await this.shipInventoryOrderService.findMany({
      ...args,
      wildcard: args.key ? { key: 'key', value: args.key } : undefined,
    });
    return { items, total };
  }
}
