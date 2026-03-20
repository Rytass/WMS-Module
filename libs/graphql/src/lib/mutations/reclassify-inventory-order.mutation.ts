import { Injectable } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import {
  ReclassifyInventoryOrderService,
  StockService,
} from '@wms-module/core';
import { ReclassifyInventoryOrderArgs } from '../inputs/reclassify-inventory-order.args';
import { ReclassifyInventoryOrderDto } from '../dto/reclassify-inventory-order.dto';

@Injectable()
@Resolver()
export class ReclassifyInventoryOrderMutation {
  constructor(
    private readonly stockService: StockService,
    private readonly reclassifyInventoryOrderService: ReclassifyInventoryOrderService,
  ) {}

  @Mutation(() => ReclassifyInventoryOrderDto)
  async reclassifyInventoryOrder(
    @Args() args: ReclassifyInventoryOrderArgs,
  ): Promise<ReclassifyInventoryOrderDto> {
    return this.reclassifyInventoryOrderService.reclassify({
      materialKey: args.materialKey,
      items: args.items.map((item) => {
        const { materialId, batchId, locationId, loaderId } =
          this.stockService.destructAggregateKey(item.aggregatedKey);
        return {
          ...item,
          materialId,
          batchId,
          locationId,
          loaderId,
        };
      }),
    });
  }
}
