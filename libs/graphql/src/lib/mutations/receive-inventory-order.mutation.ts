import { Injectable } from '@nestjs/common';
import { Args, Mutation } from '@nestjs/graphql';
import { ReceiveInventoryOrderService } from '@wms-module/core';
import { ReceiveInventoryOrderDto } from '../dto';
import {
  CreateReceiveInventoryOrderArgs,
  UpdateReceiveInventoryOrderArgs,
} from '../inputs/create-receive-inventory-order.args';

@Injectable()
export class ReceiveInventoryOrderMutation {
  constructor(
    private readonly receiveInventoryOrderService: ReceiveInventoryOrderService
  ) {}

  @Mutation(() => ReceiveInventoryOrderDto)
  async createReceiveInventoryOrder(
    @Args() args: CreateReceiveInventoryOrderArgs
  ): Promise<ReceiveInventoryOrderDto> {
    return this.receiveInventoryOrderService.createReceiveInventoryOrder(args);
  }

  @Mutation(() => ReceiveInventoryOrderDto)
  async updateReceiveInventoryOrder(
    @Args() args: UpdateReceiveInventoryOrderArgs
  ): Promise<ReceiveInventoryOrderDto> {
    return this.receiveInventoryOrderService.updateReceiveInventoryOrder(args);
  }
}
