import { Injectable } from '@nestjs/common';
import { Args, ID, Query } from '@nestjs/graphql';
import { ShipInventoryOrderService } from '@wms-module/core';
import { ShipInventoryOrderDto, ShipInventoryOrders } from '../dto';
import { FindShipInventoryOrderArgs } from '../inputs/find-ship-inventory-order.args';

@Injectable()
export class ShipInventoryOrderQuery {
  constructor(
    private readonly shipInventoryOrderService: ShipInventoryOrderService
  ) {}

  @Query(() => ShipInventoryOrderDto)
  async shipInventoryOrder(
    @Args('id', { type: () => ID }) id: string
  ): Promise<ShipInventoryOrderDto> {
    return this.shipInventoryOrderService.shipInventoryOrderRepository.findOneByOrFail(
      { id }
    );
  }

  @Query(() => ShipInventoryOrders)
  async shipInventoryOrders(
    @Args() args: FindShipInventoryOrderArgs
  ): Promise<ShipInventoryOrders> {
    const [items, total] = await this.shipInventoryOrderService.findMany(args);
    return { items, total };
  }
}
