import { Injectable } from '@nestjs/common';
import { Args, Mutation } from '@nestjs/graphql';
import { InventoryCountOrderService } from '@rytass/wms-module-core';
import {
  InventoryCountOrderDto,
  InventoryCountOrderItemDto,
} from '../dto/inventory-count-order.dto';
import {
  AddInventoryCountItemArgs,
  CountInventoryArgs,
  CreateInventoryCountOrderArgs,
  InventoryCountOrderIdArgs,
  RemoveInventoryCountItemArgs,
  UpdateInventoryCountOrderArgs,
} from '../inputs/inventory-count-order.args';
import { WmsOperation } from '../auth';
import { WmsMutationEvent } from '../events';

@Injectable()
export class InventoryCountOrderMutation {
  constructor(
    private readonly inventoryCountOrderService: InventoryCountOrderService,
  ) {}

  @Mutation(() => InventoryCountOrderDto)
  @WmsOperation({ resource: 'inventory-count-order', action: 'create' })
  @WmsMutationEvent({ event: 'inventory-count-order.created' })
  async createInventoryCountOrder(
    @Args() args: CreateInventoryCountOrderArgs,
  ): Promise<InventoryCountOrderDto> {
    return this.inventoryCountOrderService.create(
      args,
    ) as Promise<InventoryCountOrderDto>;
  }

  @Mutation(() => InventoryCountOrderDto)
  @WmsOperation({ resource: 'inventory-count-order', action: 'update' })
  @WmsMutationEvent({ event: 'inventory-count-order.updated' })
  async updateInventoryCountOrder(
    @Args() { id, ...input }: UpdateInventoryCountOrderArgs,
  ): Promise<InventoryCountOrderDto> {
    return this.inventoryCountOrderService.update(
      id,
      input,
    ) as Promise<InventoryCountOrderDto>;
  }

  @Mutation(() => InventoryCountOrderDto)
  @WmsOperation({ resource: 'inventory-count-order', action: 'start' })
  @WmsMutationEvent({ event: 'inventory-count-order.started' })
  async startInventoryCount(
    @Args() { id }: InventoryCountOrderIdArgs,
  ): Promise<InventoryCountOrderDto> {
    return this.inventoryCountOrderService.start(
      id,
    ) as Promise<InventoryCountOrderDto>;
  }

  /** "暫存結果" — record what was counted without touching stock. */
  @Mutation(() => InventoryCountOrderDto)
  @WmsOperation({ resource: 'inventory-count-order', action: 'count' })
  @WmsMutationEvent({ event: 'inventory-count-order.counted' })
  async countInventory(
    @Args() { id, items }: CountInventoryArgs,
  ): Promise<InventoryCountOrderDto> {
    return this.inventoryCountOrderService.count(
      id,
      items.map((item) => ({
        itemId: item.itemId,
        countedQuantity: item.countedQuantity ?? null,
        unitId: item.unitId,
      })),
    ) as Promise<InventoryCountOrderDto>;
  }

  @Mutation(() => InventoryCountOrderItemDto)
  @WmsOperation({ resource: 'inventory-count-order', action: 'add-item' })
  @WmsMutationEvent({ event: 'inventory-count-order.updated' })
  async addInventoryCountItem(
    @Args() { id, ...input }: AddInventoryCountItemArgs,
  ): Promise<InventoryCountOrderItemDto> {
    return this.inventoryCountOrderService.addItem(
      id,
      input,
    ) as Promise<InventoryCountOrderItemDto>;
  }

  @Mutation(() => InventoryCountOrderDto)
  @WmsOperation({ resource: 'inventory-count-order', action: 'remove-item' })
  @WmsMutationEvent({ event: 'inventory-count-order.updated' })
  async removeInventoryCountItem(
    @Args() { id, itemId }: RemoveInventoryCountItemArgs,
  ): Promise<InventoryCountOrderDto> {
    return this.inventoryCountOrderService.removeItem(
      id,
      itemId,
    ) as Promise<InventoryCountOrderDto>;
  }

  /** "清空重填" — discard the counting, keep the lock and the status. */
  @Mutation(() => InventoryCountOrderDto)
  @WmsOperation({ resource: 'inventory-count-order', action: 'reset' })
  @WmsMutationEvent({ event: 'inventory-count-order.reset' })
  async resetInventoryCount(
    @Args() { id }: InventoryCountOrderIdArgs,
  ): Promise<InventoryCountOrderDto> {
    return this.inventoryCountOrderService.reset(
      id,
    ) as Promise<InventoryCountOrderDto>;
  }

  @Mutation(() => InventoryCountOrderDto)
  @WmsOperation({ resource: 'inventory-count-order', action: 'cancel' })
  @WmsMutationEvent({ event: 'inventory-count-order.cancelled' })
  async cancelInventoryCount(
    @Args() { id }: InventoryCountOrderIdArgs,
  ): Promise<InventoryCountOrderDto> {
    return this.inventoryCountOrderService.cancel(
      id,
    ) as Promise<InventoryCountOrderDto>;
  }

  /** "執行盤差" — the only mutation here that changes stock. */
  @Mutation(() => InventoryCountOrderDto)
  @WmsOperation({ resource: 'inventory-count-order', action: 'settle' })
  @WmsMutationEvent({ event: 'inventory-count-order.settled' })
  async settleInventoryCount(
    @Args() { id }: InventoryCountOrderIdArgs,
  ): Promise<InventoryCountOrderDto> {
    return this.inventoryCountOrderService.settle(
      id,
    ) as Promise<InventoryCountOrderDto>;
  }
}
