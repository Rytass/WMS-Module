import { Injectable } from '@nestjs/common';
import { Args, Mutation } from '@nestjs/graphql';
import { ScrapeService, StockService } from '@rytass/wms-module-core';
import { ScrapeOrderDto } from '../dto/scrape-order.dto';
import { ScrapeOrderArgs } from '../inputs/scrape-order.args';
import { WmsOperation } from '../auth';

@Injectable()
export class ScrapeMutation {
  constructor(
    private readonly scrapeService: ScrapeService,
    private readonly stockService: StockService,
  ) {}

  @Mutation(() => ScrapeOrderDto)
  @WmsOperation({ resource: 'scrape-order', action: 'scrape' })
  async scrapeMaterials(
    @Args() args: ScrapeOrderArgs,
  ): Promise<ScrapeOrderDto> {
    return this.scrapeService.scrape(
      args.items.map(({ aggregateKey, ...item }) => {
        const keys = this.stockService.destructAggregateKey(aggregateKey);
        return {
          ...item,
          ...keys,
        };
      }),
    );
  }
}
