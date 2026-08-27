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
  WmsEntities,
} from '@rytass/wms-module-core';
import { BatchDto } from '../dto/batch.dto';
import { LocationDto } from '../dto/location.dto';

@Resolver(() => AggregatedStockDto)
export class AggregatedStockResolver {
  constructor(
    private readonly stockService: StockService,
    private readonly entities: WmsEntities,
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
      __entity: this.entities.material,
      __from: { id: materialId },
    });
  }

  @ResolveField(() => BatchDto)
  async batch(
    @Parent() { batchId }: AggregatedStockDto,
    @Context() { loaders }: LoaderType<BatchEntityClass>,
  ): Promise<BatchDto> {
    const { groupId } = await loaders.batchSingle.load({
      __entity: this.entities.batch,
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
      __entity: this.entities.location,
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
