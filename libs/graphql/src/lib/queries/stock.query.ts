import { Injectable } from '@nestjs/common';
import { Args, ID, Query } from '@nestjs/graphql';
import { StockService } from '@rytass/wms-module-core';
import {
  AggregatedStocks,
  ChangeLogs,
  Materials,
  StockDto,
  Stocks,
} from '../dto';
import { FindStockArgs } from '../inputs/find-stock.args';
import { WmsOperation } from '../auth';

@Injectable()
export class StockQuery {
  constructor(private readonly stockService: StockService) {}

  @Query(() => StockDto)
  @WmsOperation({ resource: 'stock', action: 'read' })
  stock(@Args('id', { type: () => ID }) id: string): Promise<StockDto> {
    return this.stockService.stockRepository.findOneByOrFail({ id });
  }

  @Query(() => Stocks)
  @WmsOperation({ resource: 'stock', action: 'read' })
  async stocks(@Args() args: FindStockArgs): Promise<Stocks> {
    const [items, total] = await this.stockService.findMany(args);
    return { items, total };
  }

  @Query(() => Materials)
  @WmsOperation({ resource: 'stock', action: 'read' })
  async stocksGroupedByMaterial(
    @Args() args: FindStockArgs,
  ): Promise<Materials> {
    const [items, total] =
      await this.stockService.findManyGroupedByMaterialId(args);
    return { items, total };
  }

  @Query(() => AggregatedStocks)
  @WmsOperation({ resource: 'stock', action: 'read' })
  async aggregatedStocks(
    @Args() args: FindStockArgs,
  ): Promise<AggregatedStocks> {
    const [items, total] = await this.stockService.findAggregatedStocks({
      ...args,
      aggregatedKeys: args.ids?.length ? args.ids : [],
    });
    return { items, total };
  }

  @Query(() => ChangeLogs)
  @WmsOperation({ resource: 'stock', action: 'read' })
  async changeLogs(@Args() args: FindStockArgs): Promise<ChangeLogs> {
    const [items, total] = await this.stockService.findChangeLogs(args);
    return {
      items: items.map((item) => ({
        ...item,
        quantity: Math.abs(item.quantity),
      })),
      total,
    };
  }
}
