import { Injectable } from '@nestjs/common';
import { ShipInventoryOrderService, StockService } from '@rytass/wms-module-core';
import { ShipInventoryOrderDto } from '../dto';
import { Args, Mutation } from '@nestjs/graphql';
import {
  CreateShipInventoryOrderArgs,
  UpdateShipInventoryOrderArgs,
} from '../inputs/create-ship-inventory-order.args';
import { ShipOrderArgs } from '../inputs/ship-order.args';
import { CancelShipOrderArgs } from '../inputs/cancel-ship-order.args';
import { WmsOperation } from '../auth';

@Injectable()
export class ShipInventoryOrderMutation {
  constructor(
    private readonly shipInventoryOrderService: ShipInventoryOrderService,
    private readonly stockService: StockService,
  ) {}

  @Mutation(() => ShipInventoryOrderDto)
  @WmsOperation({ resource: 'ship-inventory-order', action: 'create' })
  async createShipInventoryOrder(
    @Args() args: CreateShipInventoryOrderArgs,
  ): Promise<ShipInventoryOrderDto> {
    const { id } =
      await this.shipInventoryOrderService.createShipInventoryOrder(args);

    return this.shipInventoryOrderService
      .selectQueryBuilder('orders')
      .where('orders.id = :id', { id })
      .getRawOne() as Promise<ShipInventoryOrderDto>;
  }

  @Mutation(() => ShipInventoryOrderDto)
  @WmsOperation({ resource: 'ship-inventory-order', action: 'update' })
  async updateShipInventoryOrder(
    @Args() args: UpdateShipInventoryOrderArgs,
  ): Promise<ShipInventoryOrderDto> {
    const { id } =
      await this.shipInventoryOrderService.updateShipInventoryOrder({
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

    return this.shipInventoryOrderService
      .selectQueryBuilder('orders')
      .where('orders.id = :id', { id })
      .getRawOne() as Promise<ShipInventoryOrderDto>;
  }

  @Mutation(() => Boolean)
  @WmsOperation({ resource: 'ship-inventory-order', action: 'ship' })
  async ship(
    @Args('items', { type: () => [ShipOrderArgs] })
    items: ShipOrderArgs[],
  ) {
    await this.shipInventoryOrderService.ship(items);

    return true;
  }

  @Mutation(() => Boolean)
  @WmsOperation({ resource: 'ship-inventory-order', action: 'cancel' })
  async cancelShip(
    @Args('items', { type: () => [CancelShipOrderArgs] })
    items: CancelShipOrderArgs[],
  ) {
    return this.shipInventoryOrderService.cancelShip(items);
  }
}
