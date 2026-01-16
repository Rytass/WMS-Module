import { Inject, Injectable } from '@nestjs/common';
import { StockEntity, StockEntityClass } from '../models/metadata/stock.entity';
import {
  DataSource,
  ObjectLiteral,
  Repository,
  SelectQueryBuilder,
  type EntityTarget,
} from 'typeorm';
import { FindStockInput } from '../typings/find-stock.input';
import {
  MaterialEntity,
  MaterialEntityClass,
} from '../models/metadata/material.entity';

@Injectable()
export class StockService<
  T extends StockEntityClass = StockEntityClass,
  K extends MaterialEntityClass = MaterialEntityClass,
> {
  readonly stockRepository: Repository<T>;
  constructor(
    private readonly dataSource: DataSource,
    @Inject(StockEntity) private readonly stockEntity: EntityTarget<T>,
    @Inject(MaterialEntity) private readonly materialEntity: EntityTarget<K>,
  ) {
    this.stockRepository = this.dataSource.getRepository<T>(this.stockEntity);
  }

  private pipeSelectOptionsToQueryBuilder<U extends ObjectLiteral>(
    options: FindStockInput<T>,
    queryBuilder: SelectQueryBuilder<U>,
  ): SelectQueryBuilder<U> {
    if (options.materialId)
      queryBuilder.andWhere('stock."materialId" = :materialId', {
        materialId: options.materialId,
      });

    if (options.batchId)
      queryBuilder.andWhere('stock."batchId" = :batchId', {
        batchId: options.batchId,
      });

    if (options.locationId)
      queryBuilder.andWhere('stock."locationId" = :locationId', {
        locationId: options.locationId,
      });

    if (options.loaderId)
      queryBuilder.andWhere('stock."loaderId" = :loaderId', {
        loaderId: options.loaderId,
      });

    if (options.description)
      queryBuilder.andWhere('stock."description" ILIKE :description', {
        description: `%${options.description}%`,
      });

    if (options.wildcard) {
      const { key, value } = options.wildcard;
      queryBuilder.andWhere(`location."${String(key)}" ILIKE :value`, {
        value: `%${value}%`,
      });
    }

    if (options.offset !== undefined && options.offset >= 0)
      queryBuilder.skip(options.offset);

    if (options.limit !== undefined && options.limit > 0)
      queryBuilder.take(options.limit);

    return queryBuilder;
  }

  findMany(options: FindStockInput<T>): Promise<[T[], number]> {
    const queryBuilder = this.pipeSelectOptionsToQueryBuilder(
      options,
      this.dataSource
        .getRepository<T>(this.stockEntity)
        .createQueryBuilder('stock'),
    );

    return queryBuilder.getManyAndCount();
  }

  findManyGroupedByMaterialId(
    options: FindStockInput<T>,
  ): Promise<[K[], number]> {
    const queryBuilder = this.pipeSelectOptionsToQueryBuilder(
      options,
      this.dataSource
        .getRepository<K>(this.materialEntity)
        .createQueryBuilder('material')
        .leftJoinAndSelect('material.stocks', 'stock'),
    );

    return queryBuilder.getManyAndCount();
  }
}
