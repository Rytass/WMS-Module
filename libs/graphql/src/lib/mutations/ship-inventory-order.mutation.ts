import { Injectable } from '@nestjs/common';
import { ShipInventoryOrderService, StockService } from '@wms-module/core';
import { ShipInventoryOrderDto } from '../dto';
import { Args, Mutation } from '@nestjs/graphql';
import {
  CreateShipInventoryOrderArgs,
  UpdateShipInventoryOrderArgs,
} from '../inputs/create-ship-inventory-order.args';

@Injectable()
export class ShipInventoryOrderMutation {
  constructor(
    private readonly shipInventoryOrderService: ShipInventoryOrderService,
    private readonly stockService: StockService,
  ) {}

  @Mutation(() => ShipInventoryOrderDto)
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
}
