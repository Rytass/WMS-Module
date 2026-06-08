import { Injectable } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { SplitBatchOrderService, StockService } from '@rytass/wms-module-core';
import { SplitBatchArgs } from '../inputs/split-batch.args';
import { SplitBatchOrderDto } from '../dto/split-batch-order.dto';
import { WmsOperation } from '../auth';

@Injectable()
@Resolver()
export class SplitBatchMutation {
  constructor(
    private readonly stockService: StockService,
    private readonly splitBatchOrderService: SplitBatchOrderService,
  ) {}

  @Mutation(() => SplitBatchOrderDto)
  @WmsOperation({ resource: 'batch', action: 'split' })
  async splitBatch(@Args() args: SplitBatchArgs): Promise<SplitBatchOrderDto> {
    const { batchId, locationId, loaderId } =
      this.stockService.destructAggregateKey(args.aggregatedKey);
    return this.splitBatchOrderService.split({
      batchId,
      unitId: args.unitId,
      items: args.items.map((item) => ({ ...item, locationId, loaderId })),
    });
  }
}
