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
  ) => {
    return this.aggregateKeys.map((key) => aggregated[key]).join('|');
  };
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
  constructor(
    private readonly dataSource: DataSource,
    @Inject(StockEntity) private readonly stockEntity: EntityTarget<T>,
    @Inject(MaterialEntity) private readonly materialEntity: EntityTarget<K>,
  ) {
    this.stockRepository = this.dataSource.getRepository<T>(this.stockEntity);
    // select builder for status and quantity calculation, calculated field will override fields in stock entity.
    // every query should use this selectQueryBuilder to ensure status and quantity are correct
    this.selectQueryBuilder = (
      alias: string,
      qb = this.dataSource
        .getRepository<T>(this.stockEntity)
        .createQueryBuilder(alias),
    ) =>
      qb
        .leftJoin(
          (subQuery) =>
            subQuery
              .select(
                `CASE
                  WHEN qi_changes.id IS NOT NULL AND qi_changes.id IS NULL THEN '${StockStatus.PENDING_INSPECTION}'
                  WHEN qi_changes.id IS NOT NULL AND qi_changes.id IS NOT NULL THEN '${StockStatus.INSPECTION_FAILED}'
                  WHEN hi_changes.id IS NOT NULL AND s.quantity > 0 THEN '${StockStatus.HELD}'
                  WHEN to_changes.id IS NOT NULL AND s.quantity > 0 THEN '${StockStatus.IN_TRANSFER}'
                  WHEN ai_changes.id IS NOT NULL THEN '${StockStatus.ALLOCATED}'
                  WHEN tv_changes.id IS NOT NULL THEN '${StockStatus.VENDOR_INVENTORY}'
                  WHEN tc_changes.id IS NOT NULL THEN '${StockStatus.CUSTOMER_INVENTORY}'
                  ELSE '${StockStatus.FREE}'
                END`,
                'status',
              )
              .addSelect(
                `CASE
                  WHEN hi_changes.id IS NOT NULL THEN s.quantity * ABS(hi_changes."quantityChanged") / hi_changes."quantityChanged"
                  WHEN to_changes.id IS NOT NULL THEN s.quantity * ABS(to_changes."quantityChanged") / to_changes."quantityChanged"
                  ELSE s.quantity
                END`,
                'quantity',
              )
              .addSelect('s.id', 'stockId')
              .from('stocks', 's')
              .innerJoin('orders', 'o', 's."orderId" = o.id')
              // Quality Inspection Order - PENDING_INSPECTION when joined but result is null, INSPECTION_FAILED when result is false
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
              // Hold Inventory Order
              .leftJoin(
                'hold_inventory_order_changes',
                'hi_changes',
                'hi_changes.id = o.id',
              )
              // Transfer Order
              .leftJoin(
                'transfer_order_changes',
                'to_changes',
                'to_changes.id = o.id',
              )
              // Allocate Inventory Order
              .leftJoin(
                'allocate_inventory_order_changes',
                'ai_changes',
                'ai_changes.id = o.id',
              )
              // Transfer Vendor Order
              .leftJoin(
                'transfer_vendor_order_changes',
                'tv_changes',
                'tv_changes.id = o.id',
              )
              // Transfer Customer Order
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

  private pipeSelectOptionsToQueryBuilder<U extends ObjectLiteral>(
    options: FindStockInput<T>,
    queryBuilder: SelectQueryBuilder<U>,
    aggregated = false,
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

    if (aggregated) {
      queryBuilder.select('stock.materialId', 'materialId');
      queryBuilder.addSelect('stock.batchId', 'batchId');
      queryBuilder.addSelect('stock.locationId', 'locationId');
      queryBuilder.addSelect('stock.loaderId', 'loaderId');
      queryBuilder.addSelect('stock_status.status', 'status');
      queryBuilder.addSelect('SUM(stock_status.quantity)', 'quantity');
      queryBuilder.groupBy('stock.materialId');
      queryBuilder.addGroupBy('stock.batchId');
      queryBuilder.addGroupBy('stock.locationId');
      queryBuilder.addGroupBy('stock.loaderId');
      queryBuilder.addGroupBy('stock_status.status');
      queryBuilder.having('SUM(stock_status.quantity) <> 0');
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
    const queryBuilder = this.pipeSelectOptionsToQueryBuilder(
      options,
      this.selectQueryBuilder('stock'),
      true,
    );

    const count = await queryBuilder.getCount();
    const items = await queryBuilder.getRawMany<AggregatedStock>();

    return [items, count];
  }
}
