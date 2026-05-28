import { Injectable } from '@nestjs/common';
import { Args, Query } from '@nestjs/graphql';
import { AllocateInventoryOrders } from '../dto/allocate-inventory-order.dto';
import { AllocateInventoryOrderService } from '@rytass/wms-module-core';
import { FindAllocateInventoryOrderArgs } from '../inputs/find-allocate-inventory-order.args';

@Injectable()
export class AllocateInventoryOrderQuery {
  constructor(
    private readonly allocateInventoryOrderService: AllocateInventoryOrderService,
  ) {}
  @Query(() => AllocateInventoryOrders)
  async allocateInventoryOrders(
    @Args() args: FindAllocateInventoryOrderArgs,
  ): Promise<AllocateInventoryOrders> {
    const [items, total] =
      await this.allocateInventoryOrderService.findMany(args);

    return { items, total };
  }
}
