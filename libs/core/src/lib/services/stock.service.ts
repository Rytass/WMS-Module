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
import { groupBy, sumBy } from 'lodash';
import { AggregatedStock } from '../typings/aggregated-stock';

@Injectable()
export class StockService<
  T extends StockEntityClass = StockEntityClass,
  K extends MaterialEntityClass = MaterialEntityClass,
> {
  readonly stockRepository: Repository<T>;
  readonly aggregateKeys: (keyof T)[] = [
    'materialId',
    'batchId',
    'locationId',
    'loaderId',
  ];
  constructor(
    private readonly dataSource: DataSource,
    @Inject(StockEntity) private readonly stockEntity: EntityTarget<T>,
    @Inject(MaterialEntity) private readonly materialEntity: EntityTarget<K>,
  ) {
    this.stockRepository = this.dataSource.getRepository<T>(this.stockEntity);
  }

  aggregateStocks(stocks: T[]): AggregatedStock[] {
    return Object.values(
      groupBy(stocks, (stock) =>
        this.aggregateKeys.map((key) => stock[key]).join('|'),
      ),
    ).map((group) => {
      const [item] = group;
      return {
        materialId: item.materialId,
        batchId: item.batchId,
        locationId: item.locationId,
        loaderId: item.loaderId,
        status: item.status,
        quantity: sumBy(group, 'quantity'),
      };
    });
  }

  private pipeSelectOptionsToQueryBuilder<U extends ObjectLiteral>(
    options: FindStockInput<T>,
    queryBuilder: SelectQueryBuilder<U>,
  ): SelectQueryBuilder<U> {
    // status select - determine stock status by joining different order change entities
    queryBuilder.leftJoin(
      (subQuery) =>
        subQuery
          .select(
            `CASE
              WHEN qi_changes.id IS NOT NULL AND qi_changes.id IS NULL THEN '${StockStatus.PENDING_INSPECTION}'
              WHEN qi_changes.id IS NOT NULL AND qi_changes.id IS NOT NULL THEN '${StockStatus.INSPECTION_FAILED}'
              WHEN hi_changes.id IS NOT NULL THEN '${StockStatus.HELD}'
              WHEN to_changes.id IS NOT NULL THEN '${StockStatus.IN_TRANSFER}'
              WHEN ai_changes.id IS NOT NULL THEN '${StockStatus.ALLOCATED}'
              WHEN tv_changes.id IS NOT NULL THEN '${StockStatus.VENDOR_INVENTORY}'
              WHEN tc_changes.id IS NOT NULL THEN '${StockStatus.CUSTOMER_INVENTORY}'
              ELSE '${StockStatus.FREE}'
            END`,
            'status',
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
      'stock_status."stockId" = stock.id',
    );

    queryBuilder.addSelect('stock_status.status', 'status');

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
