import { Injectable } from '@nestjs/common';
import { Args, Query } from '@nestjs/graphql';
import { InventoryCountOrderService } from '@rytass/wms-module-core';
import {
  InventoryCountOrderDto,
  InventoryCountOrders,
} from '../dto/inventory-count-order.dto';
import {
  FindInventoryCountOrderArgs,
  InventoryCountOrderIdArgs,
} from '../inputs/inventory-count-order.args';
import { WmsOperation } from '../auth';

@Injectable()
export class InventoryCountOrderQuery {
  constructor(
    private readonly inventoryCountOrderService: InventoryCountOrderService,
  ) {}

  @Query(() => InventoryCountOrders)
  @WmsOperation({ resource: 'inventory-count-order', action: 'read' })
  async inventoryCountOrders(
    @Args() args: FindInventoryCountOrderArgs,
  ): Promise<InventoryCountOrders> {
    const [items, total] = await this.inventoryCountOrderService.findMany(args);

    return { items, total } as InventoryCountOrders;
  }

  @Query(() => InventoryCountOrderDto)
  @WmsOperation({ resource: 'inventory-count-order', action: 'read' })
  async inventoryCountOrder(
    @Args() { id }: InventoryCountOrderIdArgs,
  ): Promise<InventoryCountOrderDto> {
    return this.inventoryCountOrderService.findOne(
      id,
    ) as Promise<InventoryCountOrderDto>;
  }
}
