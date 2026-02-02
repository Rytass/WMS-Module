import { Context, ID, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AggregatedStockDto, LoaderDto, MaterialDto } from '../dto';
import { type LoaderType } from '../helpers';
import {
  LoadersEntityClass,
  LocationEntityClass,
  MaterialEntityClass,
  StockService,
} from '@wms-module/core';
import { BatchDto } from '../dto/batch.dto';
import { BatchEntity } from '@rytass/wms-base-nestjs-module';
import { LocationDto } from '../dto/location.dto';

@Resolver(() => AggregatedStockDto)
export class AggregatedStockResolver {
  constructor(private readonly stockService: StockService) {}

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
      __entity: MaterialEntityClass,
      __from: { id: materialId },
    });
  }

  @ResolveField(() => BatchDto)
  async batch(
    @Parent() { batchId }: AggregatedStockDto,
    @Context() { loaders }: LoaderType<BatchEntity>,
  ): Promise<BatchDto> {
    return loaders.batchSingle.load({
      __entity: BatchEntity,
      __from: { id: batchId },
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
