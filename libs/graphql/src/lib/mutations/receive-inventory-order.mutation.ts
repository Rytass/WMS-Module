import { Injectable } from '@nestjs/common';
import { Args, Mutation } from '@nestjs/graphql';
import { ReceiveInventoryOrderService } from '@rytass/wms-module-core';
import { ReceiveInventoryOrderDto } from '../dto';
import {
  CreateReceiveInventoryOrderArgs,
  UpdateReceiveInventoryOrderArgs,
} from '../inputs/create-receive-inventory-order.args';
import { DataSource } from 'typeorm';
import { ReceiveOrderArgs } from '../inputs/receive-order.args';

@Injectable()
export class ReceiveInventoryOrderMutation {
  constructor(
    private readonly dataSource: DataSource,
    private readonly receiveInventoryOrderService: ReceiveInventoryOrderService,
  ) {}

  @Mutation(() => ReceiveInventoryOrderDto)
  async createReceiveInventoryOrder(
    @Args() args: CreateReceiveInventoryOrderArgs,
  ): Promise<ReceiveInventoryOrderDto> {
    const { id } = await this.dataSource.transaction(async (manager) =>
      this.receiveInventoryOrderService.createReceiveInventoryOrder({
        ...args,
        manager,
      }),
    );

    return this.receiveInventoryOrderService
      .selectQueryBuilder('orders')
      .where('orders.id = :id', { id })
      .getRawOne() as Promise<ReceiveInventoryOrderDto>;
  }

  @Mutation(() => ReceiveInventoryOrderDto)
  async updateReceiveInventoryOrder(
    @Args() args: UpdateReceiveInventoryOrderArgs,
  ): Promise<ReceiveInventoryOrderDto> {
    const { id } = await this.dataSource.transaction(async (manager) =>
      this.receiveInventoryOrderService.updateReceiveInventoryOrder({
        ...args,
        manager,
      }),
    );

    return this.receiveInventoryOrderService
      .selectQueryBuilder('orders')
      .where('orders.id = :id', { id })
      .getRawOne() as Promise<ReceiveInventoryOrderDto>;
  }

  @Mutation(() => Boolean)
  async receive(
    @Args('items', { type: () => [ReceiveOrderArgs] })
    items: ReceiveOrderArgs[],
  ) {
    await this.receiveInventoryOrderService.receive(items);

    return true;
  }
}
