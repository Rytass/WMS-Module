import { Injectable } from '@nestjs/common';
import { Args, ID, Query } from '@nestjs/graphql';
import {
  LoaderService,
  StockService,
  TransferOrderChangeEntityClass,
  TransferOrderItemEntityClass,
  TransferOrderService,
} from '@rytass/wms-module-core';
import { LoaderDto, Loaders, LoaderTypeDto, LoaderTypes } from '../dto';
import { FindLoaderArgs } from '../inputs/find-loader.args';
import { FindLoaderTypeArgs } from '../inputs/find-loader-type.args';
import { LoaderUnit, LoaderUnitDto } from '../dto/loader-unit.dto';
import { WmsOperation } from '../auth';

@Injectable()
export class LoaderQuery {
  constructor(
    private readonly loaderService: LoaderService,
    private readonly stockService: StockService,
    private readonly transferOrderService: TransferOrderService,
  ) {}

  @Query(() => LoaderDto)
  @WmsOperation({ resource: 'loader', action: 'read' })
  loader(@Args('id', { type: () => ID }) id: string): Promise<LoaderDto> {
    return this.loaderService.loaderRepository.findOneByOrFail({ id });
  }

  @Query(() => Loaders)
  @WmsOperation({ resource: 'loader', action: 'read' })
  async loaders(@Args() args: FindLoaderArgs): Promise<Loaders> {
    const [items, total] = await this.loaderService.findManyLoaders({
      ...args,
      wildcard: args.key ? { key: 'serialId', value: args.key } : undefined,
    });
    return { items, total };
  }

  @Query(() => LoaderTypeDto)
  @WmsOperation({ resource: 'loader', action: 'read' })
  async loaderType(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<LoaderTypeDto> {
    return this.loaderService.loaderTypeRepository.findOneByOrFail({ id });
  }

  @Query(() => LoaderTypes)
  @WmsOperation({ resource: 'loader', action: 'read' })
  async loaderTypes(@Args() args: FindLoaderTypeArgs): Promise<LoaderTypes> {
    const [items, total] = await this.loaderService.findManyLoaderTypes({
      ...args,
      wildcard: args.key ? { key: 'key', value: args.key } : undefined,
    });
    return { items, total };
  }

  @Query(() => [LoaderUnitDto])
  @WmsOperation({ resource: 'loader', action: 'read' })
  loaderUnits(
    @Args('type', { type: () => LoaderUnit }) type: LoaderUnit,
  ): Promise<LoaderUnitDto[]> {
    return this.loaderService.loaderUnitRepository.findBy({
      type,
    });
  }

  @Query(() => [LoaderDto])
  @WmsOperation({ resource: 'loader', action: 'read' })
  async availableLoaders(
    @Args('locationId', { type: () => ID, nullable: true }) locationId?: string,
  ) {
    const loaders: LoaderDto[] = [];
    // every loaders from locationId +
    // (loaders with empty stocks - loader with empty stocks but being used as targetLoader in transfer order that being booked)
    const allLoaders = await this.loaderService.loaderRepository.findBy({
      isActive: true,
    });
    if (locationId)
      allLoaders.forEach((loader) => {
        if (loader.locationId === locationId) loaders.push(loader);
      });
    const [aggregatedStocks] = await this.stockService.findAggregatedStocks({
    });

    // Collect loaderIds that currently have stock
    const loaderIdsWithStock = new Set(
      aggregatedStocks.map((s) => s.loaderId).filter(Boolean),
    );

    // Find targetLoaderIds booked in not-yet-executed transfer order items
    const bookedRows =
      await this.transferOrderService.transferOrderRepository.manager
        .getRepository(TransferOrderItemEntityClass)
        .createQueryBuilder('toi')
        .select('toi."targetLoaderId"', 'targetLoaderId')
        .where('toi."targetLoaderId" IS NOT NULL')
        .andWhere('toi."removedAt" IS NULL')
        .leftJoin(
          TransferOrderChangeEntityClass,
          'toc',
          'toc."itemId" = toi.id',
        )
        .andWhere('toc.id IS NULL')
        .distinct(true)
        .getRawMany<{ targetLoaderId: string }>();

    const bookedLoaderIdSet = new Set(bookedRows.map((r) => r.targetLoaderId));

    // Add empty loaders (no stock) that are not booked as a pending targetLoader
    const collectedIds = new Set(loaders.map((l) => l.id));
    for (const loader of allLoaders) {
      if (
        !loaderIdsWithStock.has(loader.id) &&
        !bookedLoaderIdSet.has(loader.id) &&
        !collectedIds.has(loader.id)
      ) {
        loaders.push(loader);
      }
    }

    return loaders;
  }
}
