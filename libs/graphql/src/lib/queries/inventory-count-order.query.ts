import { Injectable } from '@nestjs/common';
import { Args, Query } from '@nestjs/graphql';
import { InventoryCountOrderService } from '@rytass/wms-module-core';
import {
  InventoryCountOrderDto,
  InventoryCountOrderItems,
  InventoryCountOrders,
} from '../dto/inventory-count-order.dto';
import {
  FindInventoryCountOrderArgs,
  FindInventoryCountOrderItemArgs,
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

  /**
   * The count sheet, filtered and paginated.
   *
   * Separate from `inventoryCountOrder.items` on purpose: the detail page needs
   * to narrow thousands of lines down to the shelf in front of the operator, and
   * a field resolver cannot take filters or a page.
   */
  @Query(() => InventoryCountOrderItems)
  @WmsOperation({ resource: 'inventory-count-order', action: 'read-items' })
  async inventoryCountOrderItems(
    @Args() { id, ...options }: FindInventoryCountOrderItemArgs,
  ): Promise<InventoryCountOrderItems> {
    const [items, total] = await this.inventoryCountOrderService.findItems(
      id,
      options,
    );

    return { items, total } as InventoryCountOrderItems;
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
