import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { StockEntity, StockEntityClass } from '../models/metadata/stock.entity';
import {
  DataSource,
  EntityManager,
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
import { StockStatus, ChangeType } from '../constants/stock-status';
import {
  AggregatedStock,
  ChangeLog,
  ValidateStockDeductionParams,
} from '../typings/aggregated-stock';
import { BatchEntity } from '@rytass/wms-base-nestjs-module';
import {
  LoadersEntityClass,
  LoaderTypeEntityClass,
  LocationEntityClass,
} from '../models';
import { WMS_CORE_MODULE_OPTIONS } from '../typings/core-module-options';
import type { WmsModuleCoreModuleOptions } from '../typings/core-module-options';

@Injectable()
export class StockService<
  T extends StockEntityClass = StockEntityClass,
  K extends MaterialEntityClass = MaterialEntityClass,
> implements OnModuleInit
{
  defaultLoaderId!: string;
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
    @Inject(WMS_CORE_MODULE_OPTIONS)
    private readonly coreOptions: WmsModuleCoreModuleOptions,
  ) {
    this.stockRepository = this.dataSource.getRepository<T>(this.stockEntity);
    // select builder for status and quantity calculation, calculated field will override fields in stock entity.
    // every query should use this selectQueryBuilder to ensure status and quantity are correct
    // status is resolved from batch flags: inShipment → IN_SHIPMENT, held → HELD, inTransfer → IN_TRANSFER, else → FREE
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
                  WHEN b."inShipment" = true THEN '${StockStatus.IN_SHIPMENT}'
                  WHEN b."held" = true THEN '${StockStatus.HELD}'
                  WHEN b."transferId" IS NOT NULL THEN '${StockStatus.IN_TRANSFER}'
                  ELSE '${StockStatus.FREE}'
                END`,
                'status',
              )
              .addSelect('s.id', 'stockId')
              .addSelect('b."transferId"', 'transferId')
              .addSelect('b."held"', 'held')
              .addSelect('b."inShipment"', 'inShipment')
              .from('stocks', 's')
              .innerJoin('batches', 'b', 's."batchId" = b.id'),
          'stock_status',
          `stock_status."stockId" = ${alias}.id`,
        )
        .addSelect('stock_status.status', 'status')
        .addSelect('stock_status.transferId', 'transferId')
        .addSelect('stock_status.held', 'held')
        .addSelect('stock_status.inShipment', 'inShipment')
        .addSelect(`${alias}.*`);
  }

  async onModuleInit() {
    const loaderTypeRepo = this.dataSource.getRepository(LoaderTypeEntityClass);
    const locationRepo = this.dataSource.getRepository(LocationEntityClass);
    const loaderRepo = this.dataSource.getRepository(LoadersEntityClass);

    // Ensure default loader type exists
    let loaderType = await loaderTypeRepo.findOneBy({
      key: this.coreOptions.defaultLoaderTypeKey,
    });
    if (!loaderType) {
      loaderType = await loaderTypeRepo.save(
        loaderTypeRepo.create({
          key: this.coreOptions.defaultLoaderTypeKey,
          description: this.coreOptions.defaultLoaderTypeKey,
        }),
      );
    }

    // Ensure default location exists
    let location = await locationRepo.findOneBy({
      key: this.coreOptions.defaultLocationKey,
    });
    if (!location) {
      location = await locationRepo.save(
        locationRepo.create({
          key: this.coreOptions.defaultLocationKey,
          description: this.coreOptions.defaultLocationKey,
        }),
      );
    }

    // Ensure default loader exists
    let loader = await loaderRepo.findOneBy({
      serialId: this.coreOptions.defaultLoaderSerialId,
    });
    if (!loader) {
      loader = await loaderRepo.save(
        loaderRepo.create({
          serialId: this.coreOptions.defaultLoaderSerialId,
          typeId: loaderType.id,
          locationId: location.id,
        }),
      );
    }

    this.defaultLoaderId = loader.id;
  }

  resolveLoaderId(loaderId: string | null | undefined): string {
    return loaderId || this.defaultLoaderId;
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

    if (options.status)
      queryBuilder.andWhere('stock_status.status = :status', {
        status: options.status,
      });

    if (options.negateStatus)
      queryBuilder.andWhere('stock_status.status != :negateStatus', {
        negateStatus: options.negateStatus,
      });

    if (options.materialKey)
      queryBuilder.innerJoin(
        MaterialEntityClass,
        'mk',
        'mk.id = stock."materialId" AND mk.key ILIKE :materialKey',
        {
          materialKey: `%${options.materialKey}%`,
        },
      );

    if (options.batchKey)
      queryBuilder.innerJoin(
        BatchEntity,
        'bk',
        'bk.id = stock."batchId" AND bk.key ILIKE :batchKey',
        {
          batchKey: `%${options.batchKey}%`,
        },
      );

    if (options.locationKey)
      queryBuilder.innerJoin(
        LocationEntityClass,
        'lk',
        'lk.id = stock."locationId" AND lk.key ILIKE :locationKey',
        {
          locationKey: `%${options.locationKey}%`,
        },
      );

    if (options.loaderKey)
      queryBuilder.innerJoin(
        LoadersEntityClass,
        'lk',
        'lk.id = stock."loaderId" AND lk."serialId" ILIKE :loaderKey',
        {
          loaderKey: `%${options.loaderKey}%`,
        },
      );

    if (options.offset !== undefined && options.offset >= 0)
      queryBuilder.skip(options.offset);

    if (options.limit !== undefined && options.limit > 0)
      queryBuilder.take(options.limit);

    if (aggregated) {
      queryBuilder.innerJoin('batches', 'b', 'stock."batchId" = b.id');
      queryBuilder.select('stock."materialId"', 'materialId');
      queryBuilder.addSelect('stock."batchId"', 'batchId');
      queryBuilder.addSelect('stock."locationId"', 'locationId');
      queryBuilder.addSelect('stock."loaderId"', 'loaderId');
      queryBuilder.addSelect('stock_status.status', 'status');
      queryBuilder.addSelect('stock_status."transferId"', 'transferId');
      queryBuilder.addSelect('stock_status."held"', 'held');
      queryBuilder.addSelect('stock_status."inShipment"', 'inShipment');
      queryBuilder.addSelect('b."saleId"', 'saleId');
      queryBuilder.addSelect('b."saleSerialId"', 'saleSerialId');
      queryBuilder.addSelect('b."customerId"', 'customerId');
      queryBuilder.addSelect('b."vendorId"', 'vendorId');
      queryBuilder.addSelect('b."inspectionResult"', 'inspectionResult');
      queryBuilder.addSelect('SUM(stock.quantity)', 'quantity');
      queryBuilder.groupBy('stock."materialId"');
      queryBuilder.addGroupBy('stock."batchId"');
      queryBuilder.addGroupBy('stock."locationId"');
      queryBuilder.addGroupBy('stock."loaderId"');
      queryBuilder.addGroupBy('stock_status.status');
      queryBuilder.addGroupBy('stock_status."transferId"');
      queryBuilder.addGroupBy('stock_status."held"');
      queryBuilder.addGroupBy('stock_status."inShipment"');
      queryBuilder.addGroupBy('b."saleId"');
      queryBuilder.addGroupBy('b."saleSerialId"');
      queryBuilder.addGroupBy('b."customerId"');
      queryBuilder.addGroupBy('b."vendorId"');
      queryBuilder.addGroupBy('b."inspectionResult"');
      queryBuilder.having('SUM(stock.quantity) <> 0');

      if (options.aggregatedKeys?.length)
        queryBuilder.andHaving(
          [
            'stock."materialId"',
            'stock."batchId"',
            'stock."locationId"',
            'stock."loaderId"',
            'stock_status.status',
          ].join(" || '|' || ") + ' IN (:...aggregatedKeys)',
          {
            aggregatedKeys: options.aggregatedKeys,
          },
        );
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

  async findManyGroupedByMaterialId(
    options: FindStockInput<T>,
  ): Promise<[K[], number]> {
    // Build aggregated subquery to get distinct materialIds where SUM(quantity) != 0
    const aggregateSubquery = this.pipeSelectOptionsToQueryBuilder(
      { ...options, offset: undefined, limit: undefined },
      this.selectQueryBuilder('stock'),
      true,
    );

    const rawMaterialIds = await this.dataSource
      .createQueryBuilder()
      .select('DISTINCT agg."materialId"', 'materialId')
      .from(`(${aggregateSubquery.getQuery()})`, 'agg')
      .setParameters(aggregateSubquery.getParameters())
      .getRawMany<{ materialId: string }>();

    const ids = rawMaterialIds.map((r) => r.materialId);
    if (ids.length === 0) return [[] as K[], 0];

    const queryBuilder = this.dataSource
      .getRepository<K>(this.materialEntity)
      .createQueryBuilder('material')
      .where('material.id IN (:...materialIds)', { materialIds: ids });

    if (options.offset !== undefined && options.offset >= 0)
      queryBuilder.skip(options.offset);
    if (options.limit !== undefined && options.limit > 0)
      queryBuilder.take(options.limit);

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

  async validateStockAvailability(
    params: ValidateStockDeductionParams,
    manager: EntityManager = this.dataSource.manager,
  ): Promise<void> {
    const { materialId, batchId, locationId, loaderId, quantity } = params;

    const aggregateQuery = this.pipeSelectOptionsToQueryBuilder(
      { materialId, batchId, locationId, loaderId } as FindStockInput<T>,
      this.selectQueryBuilder(
        'stock',
        manager.getRepository<T>(this.stockEntity).createQueryBuilder('stock'),
      ),
      true,
    );

    const result = await manager
      .createQueryBuilder()
      .select('COALESCE(SUM(agg.quantity), 0)', 'total')
      .from(`(${aggregateQuery.getQuery()})`, 'agg')
      .setParameters(aggregateQuery.getParameters())
      .getRawOne<{ total: string }>();

    const available = parseFloat(result?.total ?? '0');

    if (available < quantity) {
      throw new Error(
        `Insufficient stock: available ${available}, requested ${quantity} (materialId=${materialId}, batchId=${batchId}, loaderId=${loaderId})`,
      );
    }
  }

  async findAggregatedStocks(
    options: FindStockInput<T>,
  ): Promise<[AggregatedStock[], number]> {
    // Create the aggregated subquery without pagination
    const aggregateSubquery = this.pipeSelectOptionsToQueryBuilder(
      { ...options, offset: undefined, limit: undefined },
      this.selectQueryBuilder('stock'),
      options.aggregated ? true : false,
    );

    // Wrap the aggregated subquery and apply pagination on top
    const paginatedQueryBuilder = this.dataSource
      .createQueryBuilder()
      .addSelect('agg.quantity', 'quantity')
      .from(`(${aggregateSubquery.getQuery()})`, 'agg')
      .setParameters(aggregateSubquery.getParameters());
    this.aggregateKeys.forEach((key) =>
      paginatedQueryBuilder.addSelect(`agg."${key}"`, key),
    );
    // Add batch-related fields
    paginatedQueryBuilder.addSelect('agg."transferId"', 'transferId');
    paginatedQueryBuilder.addSelect('agg."held"', 'held');
    paginatedQueryBuilder.addSelect('agg."inShipment"', 'inShipment');
    paginatedQueryBuilder.addSelect('agg."saleId"', 'saleId');
    paginatedQueryBuilder.addSelect('agg."saleSerialId"', 'saleSerialId');
    paginatedQueryBuilder.addSelect('agg."customerId"', 'customerId');
    paginatedQueryBuilder.addSelect('agg."vendorId"', 'vendorId');
    paginatedQueryBuilder.addSelect(
      'agg."inspectionResult"',
      'inspectionResult',
    );

    // Apply pagination to the outer query
    if (options.offset !== undefined && options.offset >= 0) {
      paginatedQueryBuilder.skip(options.offset);
    }
    if (options.limit !== undefined && options.limit > 0) {
      paginatedQueryBuilder.take(options.limit);
    }

    // Get total count from the aggregated subquery
    const countBuilder = this.pipeSelectOptionsToQueryBuilder(
      { ...options, offset: undefined, limit: undefined },
      this.selectQueryBuilder('stock'),
      options.aggregated ? true : false,
    );

    const countResult = await this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from(`(${countBuilder.getQuery()})`, 'grouped')
      .setParameters(countBuilder.getParameters())
      .getRawOne<{ count: string }>();
    const count = parseInt(countResult?.count ?? '0', 10);

    const items = await paginatedQueryBuilder.getRawMany<AggregatedStock>();

    return [items, count];
  }

  async findChangeLogs(
    options: FindStockInput<T>,
  ): Promise<[ChangeLog[], number]> {
    // Build base query with all change entity joins
    const changesQueryBuilder = this.pipeSelectOptionsToQueryBuilder(
      { ...options, offset: undefined, limit: undefined },
      this.selectQueryBuilder('stock'),
      false,
    )
      .leftJoin(
        'receive_inventory_order_changes',
        'receive_change',
        'stock."orderId" = receive_change.id',
      )
      .leftJoin(
        'ship_inventory_order_changes',
        'ship_change',
        'stock."orderId" = ship_change.id',
      )
      .leftJoin(
        'transfer_order_changes',
        'transfer_change',
        'stock."orderId" = transfer_change.id',
      )
      .leftJoin(
        'transfer_vendor_order_changes',
        'vendor_change',
        'stock."orderId" = vendor_change.id',
      )
      .leftJoin(
        'transfer_customer_order_changes',
        'customer_change',
        'stock."orderId" = customer_change.id',
      )
      .leftJoin(
        'split_batch_order_changes',
        'split_change',
        'stock."orderId" = split_change.id',
      )
      .leftJoin(
        'merge_batch_order_changes',
        'merge_change',
        'stock."orderId" = merge_change.id',
      )
      .leftJoin(
        'allocate_inventory_order_changes',
        'allocate_change',
        'stock."orderId" = allocate_change.id',
      )
      .leftJoin(
        'reclassify_inventory_order_changes',
        'reclassify_change',
        'stock."orderId" = reclassify_change.id',
      )
      .andWhere(
        `(
          (receive_change.id IS NOT NULL AND receive_change."quantityChanged" * stock.quantity > 0)
          OR (ship_change.id IS NOT NULL AND ship_change."quantityChanged" * stock.quantity > 0)
          OR (transfer_change.id IS NOT NULL AND transfer_change."quantityChanged" * stock.quantity > 0)
          OR (vendor_change.id IS NOT NULL AND vendor_change."quantityChanged" * stock.quantity > 0)
          OR (customer_change.id IS NOT NULL AND customer_change."quantityChanged" * stock.quantity > 0)
          OR (split_change.id IS NOT NULL AND split_change."quantityChanged" * stock.quantity > 0)
          OR (merge_change.id IS NOT NULL AND merge_change."quantityChanged" * stock.quantity > 0)
          OR (allocate_change.id IS NOT NULL AND allocate_change."quantityChanged" * stock.quantity > 0)
          OR (reclassify_change.id IS NOT NULL AND reclassify_change."quantityChanged" * stock.quantity > 0)
        )`,
      );

    // Get count from the filtered base query (before adding expensive CASE)
    const countQuerySimple = changesQueryBuilder
      .clone()
      .select('COUNT(DISTINCT stock.id)', 'count');
    const countResult = await this.dataSource
      .createQueryBuilder()
      .select('SUM(counted.count)', 'total')
      .from(`(${countQuerySimple.getQuery()})`, 'counted')
      .setParameters(countQuerySimple.getParameters())
      .getRawOne<{ total: string }>();
    const count = parseInt(countResult?.total ?? '0', 10);

    // Add changeType CASE only after we have the filtered result set, apply pagination
    const resultQueryBuilder = changesQueryBuilder.clone();

    if (options.offset !== undefined && options.offset >= 0) {
      resultQueryBuilder.skip(options.offset);
    }
    if (options.limit !== undefined && options.limit > 0) {
      resultQueryBuilder.take(options.limit);
    }

    // Explicitly select only the fields needed for ChangeLog
    resultQueryBuilder
      .select('stock.id', 'id')
      .addSelect('stock.quantity', 'quantity')
      .addSelect('stock_status.status', 'status')
      .addSelect('stock."materialId"', 'materialId')
      .addSelect('stock."batchId"', 'batchId')
      .addSelect('stock."locationId"', 'locationId')
      .addSelect('stock."loaderId"', 'loaderId')
      .addSelect(
        `CASE
          WHEN receive_change.id IS NOT NULL THEN '${ChangeType.RECEIVED}'
          WHEN ship_change.id IS NOT NULL THEN
            CASE WHEN ship_change."quantityChanged" > 0 THEN '${ChangeType.IN_SHIPMENT}'
                 ELSE '${ChangeType.SHIPPED}' END
          WHEN transfer_change.id IS NOT NULL THEN
            CASE WHEN transfer_change."quantityChanged" > 0 THEN '${ChangeType.IN_TRANSFER}'
                 ELSE '${ChangeType.TRANSFERRED}' END
          WHEN vendor_change.id IS NOT NULL THEN
            CASE WHEN vendor_change."quantityChanged" > 0 THEN '${ChangeType.VENDOR_TRANSFERRED}'
                 ELSE '${ChangeType.VENDOR_RETURNED}' END
          WHEN customer_change.id IS NOT NULL THEN
            CASE WHEN customer_change."quantityChanged" > 0 THEN '${ChangeType.HELD}'
                 ELSE '${ChangeType.RELEASED}' END
          WHEN split_change.id IS NOT NULL THEN '${ChangeType.SPLITTED}'
          WHEN merge_change.id IS NOT NULL THEN '${ChangeType.MERGED}'
          WHEN allocate_change.id IS NOT NULL THEN
            CASE WHEN allocate_change."quantityChanged" > 0 THEN '${ChangeType.ALLOCATED}'
                 ELSE '${ChangeType.DEALLOCATED}' END
          WHEN reclassify_change.id IS NOT NULL THEN '${ChangeType.RECLASSIFIED}'
          ELSE NULL
        END`,
        'changeType',
      );

    const items = await resultQueryBuilder.getRawMany<ChangeLog>();

    return [items, count];
  }
}
