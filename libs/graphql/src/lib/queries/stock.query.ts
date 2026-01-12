import { Injectable } from '@nestjs/common';
import { Args, ID, Query } from '@nestjs/graphql';
import { StockService } from '@wms-module/core';
import { Materials, StockDto, Stocks } from '../dto';
import { FindStockArgs } from '../inputs/find-stock.args';

@Injectable()
export class StockQuery {
  constructor(private readonly stockService: StockService) {}

  @Query(() => StockDto)
  stock(@Args('id', { type: () => ID }) id: string): Promise<StockDto> {
    return this.stockService.stockRepository.findOneByOrFail({ id });
  }

  @Query(() => Stocks)
  async stocks(@Args() args: FindStockArgs): Promise<Stocks> {
    const [items, total] = await this.stockService.findMany(args);
    return { items, total };
  }

  @Query(() => Materials)
  async stocksGroupedByMaterial(
    @Args() args: FindStockArgs
  ): Promise<Materials> {
    const [items, total] = await this.stockService.findManyGroupedByMaterialId(
      args
    );
    return { items, total };
  }
}
