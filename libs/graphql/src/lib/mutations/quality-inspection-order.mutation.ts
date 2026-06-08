import { Injectable } from '@nestjs/common';
import { Args, Mutation } from '@nestjs/graphql';
import { QualityInspectionOrderService, StockService } from '@rytass/wms-module-core';
import { QualityInspectionOrderDto } from '../dto/quality-inspection-order.dto';
import { CreateQualityInspectionOrderArgs } from '../inputs/create-quality-inspection-order.args';
import { WmsOperation } from '../auth';

@Injectable()
export class QualityInspectionOrderMutation {
  constructor(
    private readonly qualityInspectionOrderService: QualityInspectionOrderService,
    private readonly stockService: StockService,
  ) {}

  @Mutation(() => QualityInspectionOrderDto)
  @WmsOperation({ resource: 'quality-inspection-order', action: 'inspect' })
  async inspectMaterials(
    @Args() args: CreateQualityInspectionOrderArgs,
  ): Promise<QualityInspectionOrderDto> {
    return this.qualityInspectionOrderService.inspect({
      options: {
        key: args.key,
        note: args.note,
        items: args.items.map(({ aggregateKey, ...item }) => {
          const keys = this.stockService.destructAggregateKey(aggregateKey);
          return {
            ...item,
            ...keys,
          };
        }),
      },
    });
  }
}
