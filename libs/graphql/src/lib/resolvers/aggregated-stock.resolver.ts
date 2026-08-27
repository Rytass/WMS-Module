import { Inject } from '@nestjs/common';
import { Context, ID, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AggregatedStockDto, LoaderDto, MaterialDto } from '../dto';
import { type LoaderType } from '../helpers';
import {
  BatchEntityClass,
  BatchGroupEntityClass,
  LoadersEntityClass,
  LocationEntityClass,
  MaterialEntity,
  MaterialEntityClass,
  StockService,
} from '@rytass/wms-module-core';
import { BatchDto } from '../dto/batch.dto';
import { LocationDto } from '../dto/location.dto';

@Resolver(() => AggregatedStockDto)
export class AggregatedStockResolver {
  /**
   * `materialEntity` is bound to the `MaterialEntity` Symbol, so the DataLoader
   * queries whichever material entity the consumer configured — the built-in
   * `MaterialEntityClass` unless `materialEntity` was passed to
   * `forRoot`/`forRootAsync`. Loading the built-in class outright would filter on
   * its single-table-inheritance discriminator and resolve nothing for a custom
   * entity.
   */
  constructor(
    private readonly stockService: StockService,
    @Inject(MaterialEntity)
    private readonly materialEntity: new () => MaterialEntityClass,
  ) {}

  @ResolveField(() => ID)
  async id(@Parent() stock: AggregatedStockDto): Promise<string> {
    return this.stockService.generatedAggregateKey(stock);
  }

  @ResolveField(() => MaterialDto)
  async material(
    @Parent() { materialId }: AggregatedStockDto,
    @Context() { loaders }: LoaderType<MaterialEntityClass>,
  ): Promise<MaterialDto> {
    return loaders.batchSingle.load({
      __entity: this.materialEntity,
      __from: { id: materialId },
    });
  }

  @ResolveField(() => BatchDto)
  async batch(
    @Parent() { batchId }: AggregatedStockDto,
    @Context() { loaders }: LoaderType<BatchEntityClass>,
  ): Promise<BatchDto> {
    const { groupId } = await loaders.batchSingle.load({
      __entity: BatchEntityClass,
      __from: { id: batchId },
    });

    return loaders.batchSingle.load({
      __entity: BatchGroupEntityClass,
      __from: { id: groupId },
    });
  }

  @ResolveField(() => LocationDto)
  async location(
    @Parent() { locationId }: AggregatedStockDto,
    @Context() { loaders }: LoaderType<LocationEntityClass>,
  ): Promise<LocationDto> {
    return loaders.batchSingle.load({
      __entity: LocationEntityClass,
      __from: { id: locationId },
    });
  }

  @ResolveField(() => LoaderDto)
  async loader(
    @Parent() { loaderId }: AggregatedStockDto,
    @Context() { loaders }: LoaderType<LoadersEntityClass>,
  ): Promise<LoaderDto> {
    return loaders.batchSingle.load({
      __entity: LoadersEntityClass,
      __from: { id: loaderId },
    });
  }
}
