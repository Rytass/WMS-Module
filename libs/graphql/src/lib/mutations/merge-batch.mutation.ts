import { Injectable } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { MergeBatchOrderService, StockService } from '@rytass/wms-module-core';
import { MergeBatchArgs } from '../inputs/merge-batch.args';
import { MergeBatchOrderDto } from '../dto/merge-batch-order.dto';
import { WmsOperation } from '../auth';
import { WmsMutationEvent } from '../events';

@Injectable()
@Resolver()
export class MergeBatchMutation {
  constructor(
    private readonly stockService: StockService,
    private readonly mergeBatchOrderService: MergeBatchOrderService,
  ) {}

  @Mutation(() => MergeBatchOrderDto)
  @WmsOperation({ resource: 'batch', action: 'merge' })
  @WmsMutationEvent({ event: 'batch.merged' })
  async mergeBatch(@Args() args: MergeBatchArgs): Promise<MergeBatchOrderDto> {
    return this.mergeBatchOrderService.merge({
      ...args,
      items: args.items.map((item) => {
        const { batchId, locationId, loaderId } =
          this.stockService.destructAggregateKey(item.aggregatedKey);
        return {
          ...item,
          batchId,
          locationId,
          loaderId,
        };
      }),
    });
  }
}
