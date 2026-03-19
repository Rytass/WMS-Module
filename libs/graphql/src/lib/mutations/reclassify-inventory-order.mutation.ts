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
    const { materialId, batchId, locationId, loaderId } =
      this.stockService.destructAggregateKey(args.aggregatedKey);
    return this.reclassifyInventoryOrderService.reclassify({
      materialKey: args.materialKey,
      items: args.items.map((item) => ({
        ...item,
        materialId,
        batchId,
        locationId,
        loaderId,
      })),
    });
  }
}
