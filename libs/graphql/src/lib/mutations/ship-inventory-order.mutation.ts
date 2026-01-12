import { Injectable } from '@nestjs/common';
import { ShipInventoryOrderService } from '@wms-module/core';
import { ShipInventoryOrderDto } from '../dto';
import { Args, Mutation } from '@nestjs/graphql';
import {
  CreateShipInventoryOrderArgs,
  UpdateShipInventoryOrderArgs,
} from '../inputs/create-ship-inventory-order.args';

@Injectable()
export class ShipInventoryOrderMutation {
  constructor(
    private readonly shipInventoryOrderService: ShipInventoryOrderService
  ) {}

  @Mutation(() => ShipInventoryOrderDto)
  async createShipInventoryOrder(
    @Args() args: CreateShipInventoryOrderArgs
  ): Promise<ShipInventoryOrderDto> {
    return this.shipInventoryOrderService.createShipInventoryOrder(args);
  }

  @Mutation(() => ShipInventoryOrderDto)
  async updateShipInventoryOrder(
    @Args() args: UpdateShipInventoryOrderArgs
  ): Promise<ShipInventoryOrderDto> {
    return this.shipInventoryOrderService.updateShipInventoryOrder(args);
  }
}
