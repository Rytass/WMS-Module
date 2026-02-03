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
import { StockStatus } from '../constants/stock-status';
import { AggregatedStock } from '../typings/aggregated-stock';

@Injectable()
export class StockService<
  T extends StockEntityClass = StockEntityClass,
  K extends MaterialEntityClass = MaterialEntityClass,
> {
  readonly stockRepository: Repository<T>;
  readonly selectQueryBuilder: (
    alias: string,
    qb?: SelectQueryBuilder<T>,
  ) => SelectQueryBuilder<T>;
  readonly aggregateKeys: (keyof Pick<
    T,
    'materialId' | 'batchId' | 'locationId' | 'loaderId' | 'status'
  >)[] = ['materialId', 'batchId', 'locationId', 'loaderId', 'status'];

  readonly generatedAggregateKey = <
    A extends { [key in (typeof this.aggregateKeys)[number]]: T[key] },
  >(
    aggregated: A,
  ) => this.aggregateKeys.map((key) => aggregated[key]).join('|');

  readonly destructAggregateKey = (key: string) => {
    const [materialId, batchId, locationId, loaderId, status] = key.split('|');
    return {
      materialId,
      batchId,
      locationId,
      loaderId,
      status: status as StockStatus,
    };
  };

  private readonly statusCase = `CASE
    WHEN qi_changes.id IS NOT NULL AND qi_changes.id IS NULL THEN '${StockStatus.PENDING_INSPECTION}'
    WHEN qi_changes.id IS NOT NULL AND qi_changes.id IS NOT NULL THEN '${StockStatus.INSPECTION_FAILED}'
    WHEN hi_changes.id IS NOT NULL AND s.quantity > 0 THEN '${StockStatus.HELD}'
    WHEN to_changes.id IS NOT NULL AND s.quantity > 0 THEN '${StockStatus.IN_TRANSFER}'
    WHEN ai_changes.id IS NOT NULL THEN '${StockStatus.ALLOCATED}'
    WHEN tv_changes.id IS NOT NULL THEN '${StockStatus.VENDOR_INVENTORY}'
    WHEN tc_changes.id IS NOT NULL THEN '${StockStatus.CUSTOMER_INVENTORY}'
    ELSE '${StockStatus.FREE}'
  END`;

  private readonly quantityCase = `CASE
    WHEN hi_changes.id IS NOT NULL THEN s.quantity * ABS(hi_changes."quantityChanged") / hi_changes."quantityChanged"
    WHEN to_changes.id IS NOT NULL THEN s.quantity * ABS(to_changes."quantityChanged") / to_changes."quantityChanged"
    ELSE s.quantity
  END`;

  constructor(
    private readonly dataSource: DataSource,
    @Inject(StockEntity) private readonly stockEntity: EntityTarget<T>,
    @Inject(MaterialEntity) private readonly materialEntity: EntityTarget<K>,
  ) {
    this.stockRepository = this.dataSource.getRepository<T>(this.stockEntity);
    this.selectQueryBuilder = (
      alias: string,
      qb = this.dataSource
        .getRepository<T>(this.stockEntity)
        .createQueryBuilder(alias),
    ) => this.buildStatusSubquery(qb, alias);
  }

  private buildStatusSubquery(
    qb: SelectQueryBuilder<T>,
    alias: string,
  ): SelectQueryBuilder<T> {
    return qb
      .leftJoin(
        (subQuery) =>
          subQuery
            .select(this.statusCase, 'status')
            .addSelect(this.quantityCase, 'quantity')
            .addSelect('s.id', 'stockId')
            .from('stocks', 's')
            .innerJoin('orders', 'o', 's."orderId" = o.id')
            .leftJoin(
              'quality_inspection_order_changes',
              'qi_changes',
              'qi_changes.id = o.id AND qi_changes."result" IS NULL',
            )
            .leftJoin(
              'quality_inspection_order_changes',
              'qi_failed',
              'qi_failed.id = o.id AND qi_failed."result" = false',
            )
            .leftJoin(
              'hold_inventory_order_changes',
              'hi_changes',
              'hi_changes.id = o.id',
            )
            .leftJoin(
              'transfer_order_changes',
              'to_changes',
              'to_changes.id = o.id',
            )
            .leftJoin(
              'allocate_inventory_order_changes',
              'ai_changes',
              'ai_changes.id = o.id',
            )
            .leftJoin(
              'transfer_vendor_order_changes',
              'tv_changes',
              'tv_changes.id = o.id',
            )
            .leftJoin(
              'transfer_customer_order_changes',
              'tc_changes',
              'tc_changes.id = o.id',
            ),
        'stock_status',
        `stock_status."stockId" = ${alias}.id`,
      )
      .addSelect('stock_status.status', 'status')
      .addSelect('stock_status.quantity', 'quantity')
      .addSelect(`${alias}.*`);
  }

  private applyFilters<U extends ObjectLiteral>(
    qb: SelectQueryBuilder<U>,
    options: FindStockInput<T>,
  ): void {
    const filters = [
      { field: 'materialId', value: options.materialId },
      { field: 'batchId', value: options.batchId },
      { field: 'locationId', value: options.locationId },
      { field: 'loaderId', value: options.loaderId },
    ];

    filters.forEach(({ field, value }) => {
      if (value) {
        qb.andWhere(`stock."${field}" = :${field}`, { [field]: value });
      }
    });

    if (options.description) {
      qb.andWhere('stock."description" ILIKE :description', {
        description: `%${options.description}%`,
      });
    }

    if (options.wildcard) {
      const { key, value } = options.wildcard;
      qb.andWhere(`location."${String(key)}" ILIKE :value`, {
        value: `%${value}%`,
      });
    }
  }

  private applyPagination<U extends ObjectLiteral>(
    qb: SelectQueryBuilder<U>,
    options: FindStockInput<T>,
  ): void {
    if (options.offset !== undefined && options.offset >= 0) {
      qb.skip(options.offset);
    }
    if (options.limit !== undefined && options.limit > 0) {
      qb.take(options.limit);
    }
  }

  private applyAggregation<U extends ObjectLiteral>(
    qb: SelectQueryBuilder<U>,
  ): void {
    const fields = ['materialId', 'batchId', 'locationId', 'loaderId'] as const;
    qb.select(fields.map((f) => `stock."${f}"`).join(', '), fields.join(', '));
    qb.addSelect('stock_status.status', 'status');
    qb.addSelect('SUM(stock_status.quantity)', 'quantity');

    fields.forEach((field) => qb.addGroupBy(`stock."${field}"`));
    qb.addGroupBy('stock_status.status');
    qb.having('SUM(stock_status.quantity) <> 0');
  }

  private pipeSelectOptionsToQueryBuilder<U extends ObjectLiteral>(
    options: FindStockInput<T>,
    queryBuilder: SelectQueryBuilder<U>,
    aggregated = false,
  ): SelectQueryBuilder<U> {
    this.applyFilters(queryBuilder, options);

    if (aggregated) {
      this.applyAggregation(queryBuilder);
    } else {
      this.applyPagination(queryBuilder, options);
    }

    return queryBuilder;
  }

  findMany(options: FindStockInput<T>): Promise<[T[], number]> {
    const queryBuilder = this.pipeSelectOptionsToQueryBuilder(
      options,
      this.selectQueryBuilder('stock'),
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

  async findAggregatedStock(
    options: Omit<AggregatedStock, 'quantity'>,
    manager = this.dataSource.manager,
  ): Promise<AggregatedStock | undefined> {
    const queryBuilder = this.pipeSelectOptionsToQueryBuilder(
      options,
      this.selectQueryBuilder(
        'stock',
        manager.getRepository<T>(this.stockEntity).createQueryBuilder('stock'),
      ),
      true,
    );

    return queryBuilder.getRawOne<AggregatedStock>();
  }

  async findAggregatedStocks(
    options: FindStockInput<T>,
  ): Promise<[AggregatedStock[], number]> {
    const aggregatedQueryBuilder = this.pipeSelectOptionsToQueryBuilder(
      { ...options, limit: undefined, offset: undefined }, // Remove pagination temporarily
      this.selectQueryBuilder('stock'),
      true,
    );

    const count = await aggregatedQueryBuilder.getCount();

    const subQuery = aggregatedQueryBuilder.getQuery();

    const paginatedQueryBuilder = this.dataSource
      .getRepository<T>(this.stockEntity)
      .createQueryBuilder()
      .select('*')
      .from(`(${subQuery})`, 'aggregated')
      .setParameters(aggregatedQueryBuilder.getParameters());

    // Apply pagination to the outer query
    if (options.offset !== undefined && options.offset >= 0) {
      paginatedQueryBuilder.skip(options.offset);
    }

    if (options.limit !== undefined && options.limit > 0) {
      paginatedQueryBuilder.take(options.limit);
    }

    const items = await paginatedQueryBuilder.getRawMany<AggregatedStock>();

    return [items, count];
  }
}
