import { Injectable } from '@nestjs/common';
import { Args, ID, Query } from '@nestjs/graphql';
import { ReceiveInventoryOrderService } from '@rytass/wms-module-core';
import { ReceiveInventoryOrderDto, ReceiveInventoryOrders } from '../dto';
import { FindReceiveInventoryOrderArgs } from '../inputs/find-receive-inventory-order.args';
import { WmsOperation } from '../auth';

@Injectable()
export class ReceiveInventoryOrderQuery {
  constructor(
    private readonly receiveInventoryOrderService: ReceiveInventoryOrderService,
  ) {}

  @Query(() => ReceiveInventoryOrderDto)
  @WmsOperation({ resource: 'receive-inventory-order', action: 'read' })
  async receiveInventoryOrder(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<ReceiveInventoryOrderDto> {
    return this.receiveInventoryOrderService
      .selectQueryBuilder('orders')
      .where('orders.id = :id', { id })
      .getRawOne() as Promise<ReceiveInventoryOrderDto>;
  }

  @Query(() => ReceiveInventoryOrders)
  @WmsOperation({ resource: 'receive-inventory-order', action: 'read' })
  async receiveInventoryOrders(
    @Args() args: FindReceiveInventoryOrderArgs,
  ): Promise<ReceiveInventoryOrders> {
    const [items, total] = await this.receiveInventoryOrderService.findMany({
      ...args,
      wildcard: args.key ? { key: 'key', value: args.key } : undefined,
    });
    return { items, total };
  }
}
