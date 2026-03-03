import { Injectable } from '@nestjs/common';
import { Args, ID, Query } from '@nestjs/graphql';
import { ReceiveInventoryOrderService } from '@wms-module/core';
import { ReceiveInventoryOrderDto, ReceiveInventoryOrders } from '../dto';
import { FindReceiveInventoryOrderArgs } from '../inputs/find-receive-inventory-order.args';

@Injectable()
export class ReceiveInventoryOrderQuery {
  constructor(
    private readonly receiveInventoryOrderService: ReceiveInventoryOrderService,
  ) {}

  @Query(() => ReceiveInventoryOrderDto)
  async receiveInventoryOrder(
    @Args('key', { type: () => ID }) key: string,
  ): Promise<ReceiveInventoryOrderDto> {
    return this.receiveInventoryOrderService
      .selectQueryBuilder('orders')
      .where('orders.key = :key', { key })
      .getRawOne() as Promise<ReceiveInventoryOrderDto>;
  }

  @Query(() => ReceiveInventoryOrders)
  async receiveInventoryOrders(
    @Args() args: FindReceiveInventoryOrderArgs,
  ): Promise<ReceiveInventoryOrders> {
    const [items, total] =
      await this.receiveInventoryOrderService.findMany(args);
    return { items, total };
  }
}
