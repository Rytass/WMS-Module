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
import { WmsEntities } from '../models/wms-entities';
import { tablePathOf } from '../utils/table-path';
import { getWmsTablePrefix } from '../table-prefix/logical-table-name';

/**
 * A lock taken in autocommit is released by the statement that took it, so a
 * check "protected" by one is not protected at all. Refuse instead.
 */
const assertInTransaction = (manager: EntityManager, method: string): void => {
  if (!manager.queryRunner?.isTransactionActive) {
    throw new Error(
      `${method} must run inside a transaction: pass the EntityManager of an active transaction (dataSource.transaction(manager => ...)). Outside one the lock is released before the check it guards.`,
    );
  }
};

@Injectable()
export class StockService<
  T extends StockEntityClass = StockEntityClass,
  K extends MaterialEntityClass = MaterialEntityClass,
> implements OnModuleInit
{
  defaultLoaderId!: string;
  defaultLocationId!: string;
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
    private readonly entities: WmsEntities,
    @Inject(StockEntity) private readonly stockEntity: EntityTarget<T>,
    // Declared as a class rather than the wider `EntityTarget<K>`: `ModelsModule`
    // only ever binds this Symbol to an entity class, and `materialKey` needs a
    // `Function` to join against.
    @Inject(MaterialEntity) private readonly materialEntity: new () => K,
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
              .addSelect('b."inspectionResult"', 'inspectionResult')
              .addSelect('b."requiresInspection"', 'requiresInspection')
              .addSelect('b."saleId"', 'saleId')
              .addSelect('b."vendorId"', 'vendorId')
              .addSelect('b."customerId"', 'customerId')
              .from(tablePathOf(this.dataSource, this.stockEntity), 's')
              .innerJoin(
                tablePathOf(this.dataSource, this.entities.batch),
                'b',
                's."batchId" = b.id',
              ),
          'stock_status',
          `stock_status."stockId" = ${alias}.id`,
        )
        .addSelect('stock_status.status', 'status')
        .addSelect('stock_status."transferId"', 'transferId')
        .addSelect('stock_status.held', 'held')
        .addSelect('stock_status."inShipment"', 'inShipment')
        .addSelect('stock_status."inspectionResult"', 'inspectionResult')
        .addSelect('stock_status."requiresInspection"', 'requiresInspection')
        .addSelect('stock_status."saleId"', 'saleId')
        .addSelect('stock_status."vendorId"', 'vendorId')
        .addSelect('stock_status."customerId"', 'customerId')
        .addSelect(`${alias}.*`);
  }

  /**
   * Resolve -- and unless `seedDefaults: false`, create -- the default loader
   * type, location and loader every movement without an explicit one lands on.
   *
   * Idempotent across instances: the find-or-create runs in one transaction
   * holding a transaction-scoped advisory lock, so pods starting together queue
   * on it and the second finds what the first created instead of inserting a
   * duplicate default (the keys carry no unique constraint to stop it).
   */
  async onModuleInit(): Promise<void> {
    this.assertTablePrefix();

    const { defaultLoaderTypeKey, defaultLocationKey, defaultLoaderSerialId } =
      this.coreOptions;
    const seed = this.coreOptions.seedDefaults ?? true;

    const { locationId, loaderId } = await this.dataSource.transaction(
      async (manager) => {
        const loaderTypeRepo = manager.getRepository(LoaderTypeEntityClass);
        const locationRepo = manager.getRepository(this.entities.location);
        const loaderRepo = manager.getRepository(LoadersEntityClass);

        if (seed) {
          await manager.query(
            `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
            ['wms:seed-defaults'],
          );
        }

        const findOrSeed = async <E extends object>(
          what: string,
          find: () => Promise<E | null>,
          create: () => Promise<E>,
        ): Promise<E> => {
          const existing = await find();
          if (existing) return existing;
          if (!seed) {
            throw new Error(
              `WmsModuleCoreModule: seedDefaults is false but the default ${what} does not exist; seed it before the module starts.`,
            );
          }

          return create();
        };

        const loaderType = await findOrSeed(
          `loader type "${defaultLoaderTypeKey}"`,
          () => loaderTypeRepo.findOneBy({ key: defaultLoaderTypeKey }),
          () =>
            loaderTypeRepo.save(
              loaderTypeRepo.create({
                key: defaultLoaderTypeKey,
                description: defaultLoaderTypeKey,
              }),
            ),
        );

        const location = await findOrSeed(
          `location "${defaultLocationKey}"`,
          () => locationRepo.findOneBy({ key: defaultLocationKey }),
          () =>
            locationRepo.save(
              locationRepo.create({
                key: defaultLocationKey,
                description: defaultLocationKey,
              }),
            ),
        );

        const loader = await findOrSeed(
          `loader "${defaultLoaderSerialId}"`,
          () => loaderRepo.findOneBy({ serialId: defaultLoaderSerialId }),
          () =>
            loaderRepo.save(
              loaderRepo.create({
                serialId: defaultLoaderSerialId,
                typeId: loaderType.id,
                locationId: location.id,
              }),
            ),
        );

        return { locationId: location.id, loaderId: loader.id };
      },
    );

    this.defaultLocationId = locationId;
    this.defaultLoaderId = loaderId;
  }

  /**
   * `tablePrefix` is a check, not a setting: the prefix has to be applied
   * before the DataSource initialised, which is long before this module's
   * options resolve. Read back the table the stock entity really landed in.
   */
  private assertTablePrefix(): void {
    const expected = this.coreOptions.tablePrefix;

    if (expected === undefined) return;

    const actual = this.dataSource.getMetadata(this.stockEntity).tableName;

    if (actual !== `${expected}stocks` || getWmsTablePrefix() !== expected) {
      throw new Error(
        `WmsModuleCoreModule: tablePrefix is "${expected}" but the stock table is "${actual}" (prefix in effect: "${getWmsTablePrefix()}"). Wrap the runtime DataSource options in withWmsTablePrefix(options, "${expected}") -- and the migration DataSource too.`,
      );
    }
  }

  resolveLoaderId(loaderId: string | null | undefined): string {
    return loaderId || this.defaultLoaderId;
  }

  resolveLocationId(locationId: string | null | undefined): string {
    return locationId || this.defaultLocationId;
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

    if (options.excludeLocationIds?.length)
      queryBuilder.andWhere(
        'stock."locationId" NOT IN (:...excludeLocationIds)',
        { excludeLocationIds: options.excludeLocationIds },
      );

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

    if (options.status) {
      switch (options.status) {
        case StockStatus.PENDING_INSPECTION:
          /*
           * Both halves are required. `inspectionResult IS NULL` alone is the
           * resting state of every batch nobody ever asked to inspect, so on
           * its own it reported the whole warehouse as awaiting inspection --
           * a wrong answer that looked plausible because it was never zero.
           */
          queryBuilder.andWhere(
            'stock_status."requiresInspection" = true AND stock_status."inspectionResult" IS NULL',
          );
          break;
        case StockStatus.INSPECTION_FAILED:
          queryBuilder.andWhere('stock_status."inspectionResult" = false');
          break;
        case StockStatus.ALLOCATED:
          queryBuilder.andWhere('stock_status."saleId" IS NOT NULL');
          break;
        case StockStatus.VENDOR_INVENTORY:
          queryBuilder.andWhere('stock_status."vendorId" IS NOT NULL');
          break;
        case StockStatus.CUSTOMER_INVENTORY:
          queryBuilder.andWhere('stock_status."customerId" IS NOT NULL');
          break;
        default:
          queryBuilder.andWhere('stock_status.status = :status', {
            status: options.status,
          });
          break;
      }
    }

    if (options.negateStatus) {
      switch (options.negateStatus) {
        case StockStatus.PENDING_INSPECTION:
          queryBuilder.andWhere(
            'NOT (stock_status."requiresInspection" = true AND stock_status."inspectionResult" IS NULL)',
          );
          break;
        case StockStatus.INSPECTION_FAILED:
          queryBuilder.andWhere(
            '(stock_status."inspectionResult" IS NULL OR stock_status."inspectionResult" != false)',
          );
          break;
        case StockStatus.ALLOCATED:
          queryBuilder.andWhere('stock_status."saleId" IS NULL');
          break;
        case StockStatus.VENDOR_INVENTORY:
          queryBuilder.andWhere('stock_status."vendorId" IS NULL');
          break;
        case StockStatus.CUSTOMER_INVENTORY:
          queryBuilder.andWhere('stock_status."customerId" IS NULL');
          break;
        default:
          queryBuilder.andWhere('stock_status.status != :negateStatus', {
            negateStatus: options.negateStatus,
          });
          break;
      }
    }

    if (options.materialKey)
      queryBuilder.innerJoin(
        // The configured entity, not the built-in class: this follows whatever
        // table that entity is mapped to. (TypeORM resolves an entity in a
        // hand-written join to its table name and does not append the
        // single-table discriminator, so for a child of `MaterialEntityClass` the
        // emitted SQL is unchanged — this keeps the service from reaching past
        // its own configuration, it is not a behaviour fix on its own.)
        this.materialEntity,
        'mk',
        'mk.id = stock."materialId" AND mk.key ILIKE :materialKey',
        {
          materialKey: `%${options.materialKey}%`,
        },
      );

    if (options.batchKey)
      queryBuilder.innerJoin(
        this.entities.batch,
        'bk',
        'bk.id = stock."batchId" AND bk.key ILIKE :batchKey',
        {
          batchKey: `%${options.batchKey}%`,
        },
      );

    if (options.locationKey)
      queryBuilder.innerJoin(
        this.entities.location,
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

    /*
     * Vendor / customer / sale order live on the batch, so they need their own
     * join. One join for all four rather than four joins: they are conditions on
     * the same row, and repeating the join would multiply nothing but the plan.
     *
     * Exact match, not ILIKE: these are identifiers handed over by the host
     * system, and a partial match on 「SO-1」 quietly sweeping in 「SO-10」 is the
     * kind of wrong answer nobody notices. It also keeps this in step with the
     * inventory count sheet, whose four filters match the same way.
     */
    const batchAttributeFilters = (
      [
        ['vendorId', options.vendorId],
        ['customerId', options.customerId],
        ['saleId', options.saleId],
        ['saleSerialId', options.saleSerialId],
      ] as const
    ).filter(([, value]) => Boolean(value));

    if (batchAttributeFilters.length) {
      queryBuilder.innerJoin(
        this.entities.batch,
        'ba',
        'ba.id = stock."batchId"',
      );

      for (const [column, value] of batchAttributeFilters) {
        queryBuilder.andWhere(`ba."${column}" = :${column}`, {
          [column]: value,
        });
      }
    }

    if (options.offset !== undefined && options.offset >= 0)
      queryBuilder.skip(options.offset);

    if (options.limit !== undefined && options.limit > 0)
      queryBuilder.take(options.limit);

    if (aggregated) {
      queryBuilder.innerJoin(
        tablePathOf(this.dataSource, this.entities.batch),
        'b',
        'stock."batchId" = b.id',
      );
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
      queryBuilder.addSelect('b."requiresInspection"', 'requiresInspection');
      /*
       * Lineage and the host's own attributes, carried along the same way the
       * commercial attributes above are. Both are functionally dependent on
       * `batchId`, which is already a grouping key, but SQL still wants them
       * named in GROUP BY. `attributes` is jsonb, which groups fine — jsonb has
       * equality and a btree opclass.
       */
      queryBuilder.addSelect('b."parentBatchId"', 'parentBatchId');
      queryBuilder.addSelect('b."attributes"', 'attributes');
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
      queryBuilder.addGroupBy('b."requiresInspection"');
      queryBuilder.addGroupBy('b."parentBatchId"');
      queryBuilder.addGroupBy('b."attributes"');
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

  /**
   * Take the transaction-scoped stock locks for `slots`, deduplicated and in a
   * fixed order (materialId, then batchId, compared as strings), so two
   * operations locking overlapping sets acquire them in the same order.
   *
   * The lock is per **(material, batch)**, not per full slot. A deduction
   * check filters on material and batch always, but on location and loader
   * only when the caller names them, so a finer key would let a check that
   * spans locations and one that names a location run side by side over the
   * same rows. Coarser is the only key that is right for every caller.
   *
   * Refuses outright what it cannot protect, rather than returning as if it
   * had: a manager outside a transaction (in autocommit the lock is released
   * by the statement that took it, before the sum it was meant to guard), and
   * a slot without a material or batch (no key to lock -- the check that
   * followed would sum unlocked and could oversell).
   */
  async lockStockSlots(
    slots: readonly {
      readonly materialId?: string | null;
      readonly batchId?: string | null;
    }[],
    manager: EntityManager,
  ): Promise<void> {
    assertInTransaction(manager, 'lockStockSlots');

    const keys = [
      ...new Set(
        slots.map((slot) => {
          if (!slot.materialId || !slot.batchId) {
            throw new Error(
              `lockStockSlots: every slot needs a materialId and a batchId (got materialId=${slot.materialId}, batchId=${slot.batchId})`,
            );
          }

          return `wms:stock:${slot.materialId}:${slot.batchId}`;
        }),
      ),
    ].sort();

    for (const key of keys) {
      await manager.query(
        `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
        [key],
      );
    }
  }

  /**
   * Refuse a deduction the shelf cannot cover.
   *
   * Locks the (material, batch) first and only then sums, so of two
   * transactions deducting the same stock the second waits for the first to
   * commit and then sees its deduction (the unlocked sum let both pass
   * and oversold). That relies on READ COMMITTED, PostgreSQL's default: under
   * REPEATABLE READ or SERIALIZABLE the second transaction's snapshot predates
   * the first commit and the sum is stale even after the wait.
   */
  async validateStockAvailability(
    params: ValidateStockDeductionParams,
    manager: EntityManager,
  ): Promise<void> {
    const { materialId, batchId, locationId, loaderId, quantity } = params;

    await this.lockStockSlots([{ materialId, batchId }], manager);

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
    manager: EntityManager = this.dataSource.manager,
  ): Promise<[AggregatedStock[], number]> {
    // Create the aggregated subquery without pagination
    const aggregateSubquery = this.pipeSelectOptionsToQueryBuilder(
      { ...options, offset: undefined, limit: undefined },
      this.selectQueryBuilder(
        'stock',
        manager.getRepository<T>(this.stockEntity).createQueryBuilder('stock'),
      ),
      // Always aggregated. The outer projection below is hard-wired to the
      // aggregated shape (it selects agg."saleSerialId" and friends), so letting
      // the caller switch the inner subquery off asked the outer query for a
      // column the inner one never produced — a hard `column agg."saleSerialId"
      // does not exist`. There was never a working `false` here: this method
      // returns AggregatedStock[], so aggregating is its only meaning.
      true,
    );

    // Wrap the aggregated subquery and apply pagination on top
    const paginatedQueryBuilder = manager
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
    paginatedQueryBuilder.addSelect(
      'agg."requiresInspection"',
      'requiresInspection',
    );
    paginatedQueryBuilder.addSelect('agg."parentBatchId"', 'parentBatchId');
    paginatedQueryBuilder.addSelect('agg."attributes"', 'attributes');

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
      this.selectQueryBuilder(
        'stock',
        manager.getRepository<T>(this.stockEntity).createQueryBuilder('stock'),
      ),
      // Always aggregated. The outer projection below is hard-wired to the
      // aggregated shape (it selects agg."saleSerialId" and friends), so letting
      // the caller switch the inner subquery off asked the outer query for a
      // column the inner one never produced — a hard `column agg."saleSerialId"
      // does not exist`. There was never a working `false` here: this method
      // returns AggregatedStock[], so aggregating is its only meaning.
      true,
    );

    const countResult = await manager
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
    // Our own change tables, named as they ended up under `withWmsTablePrefix`.
    const prefix = getWmsTablePrefix();

    // Build base query with all change entity joins
    const changesQueryBuilder = this.pipeSelectOptionsToQueryBuilder(
      { ...options, offset: undefined, limit: undefined },
      this.selectQueryBuilder('stock'),
      false,
    )
      .leftJoin(
        `${prefix}receive_inventory_order_changes`,
        'receive_change',
        'stock."orderId" = receive_change.id',
      )
      .leftJoin(
        `${prefix}ship_inventory_order_changes`,
        'ship_change',
        'stock."orderId" = ship_change.id',
      )
      .leftJoin(
        `${prefix}transfer_order_changes`,
        'transfer_change',
        'stock."orderId" = transfer_change.id',
      )
      .leftJoin(
        `${prefix}transfer_vendor_order_changes`,
        'vendor_change',
        'stock."orderId" = vendor_change.id',
      )
      .leftJoin(
        `${prefix}transfer_customer_order_changes`,
        'customer_change',
        'stock."orderId" = customer_change.id',
      )
      .leftJoin(
        `${prefix}hold_inventory_order_changes`,
        'hold_change',
        'stock."orderId" = hold_change.id',
      )
      .leftJoin(
        `${prefix}split_batch_order_changes`,
        'split_change',
        'stock."orderId" = split_change.id',
      )
      .leftJoin(
        `${prefix}merge_batch_order_changes`,
        'merge_change',
        'stock."orderId" = merge_change.id',
      )
      .leftJoin(
        `${prefix}allocate_inventory_order_changes`,
        'allocate_change',
        'stock."orderId" = allocate_change.id',
      )
      .leftJoin(
        `${prefix}reclassify_inventory_order_changes`,
        'reclassify_change',
        'stock."orderId" = reclassify_change.id',
      )
      .leftJoin(
        `${prefix}scrape_order_changes`,
        'scrape_change',
        'stock."orderId" = scrape_change.id',
      )
      .andWhere(
        `(
          (receive_change.id IS NOT NULL AND receive_change."quantityChanged" * stock.quantity > 0)
          OR (ship_change.id IS NOT NULL AND ship_change."quantityChanged" * stock.quantity > 0)
          OR (transfer_change.id IS NOT NULL AND transfer_change."quantityChanged" * stock.quantity > 0)
          OR (vendor_change.id IS NOT NULL AND vendor_change."quantityChanged" * stock.quantity > 0)
          OR (customer_change.id IS NOT NULL AND customer_change."quantityChanged" * stock.quantity > 0)
          OR (hold_change.id IS NOT NULL AND hold_change."quantityChanged" * stock.quantity > 0)
          OR (split_change.id IS NOT NULL AND split_change."quantityChanged" * stock.quantity > 0)
          OR (merge_change.id IS NOT NULL AND merge_change."quantityChanged" * stock.quantity > 0)
          OR (allocate_change.id IS NOT NULL AND allocate_change."quantityChanged" * stock.quantity > 0)
          OR (reclassify_change.id IS NOT NULL AND reclassify_change."quantityChanged" * stock.quantity > 0)
          OR (scrape_change.id IS NOT NULL AND scrape_change."quantityChanged" * stock.quantity > 0)
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

    // Raw query with eleven joins: `skip`/`take` are entity-mode pagination
    // and TypeORM drops them from a raw query that has a join, so the whole
    // history came back on every page. `offset`/`limit` are emitted as SQL.
    // Every join here is on a primary key (`<change>.id` is the base order
    // id) or a one-row-per-stock subquery, so no row is ever multiplied and
    // a page is exactly `limit` rows.
    if (options.offset !== undefined && options.offset >= 0) {
      resultQueryBuilder.offset(options.offset);
    }
    if (options.limit !== undefined && options.limit > 0) {
      resultQueryBuilder.limit(options.limit);
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
            CASE WHEN customer_change."quantityChanged" > 0 THEN '${ChangeType.CUSTOMER_HELD}'
                 ELSE '${ChangeType.CUSTOMER_RETURNED}' END
          WHEN hold_change.id IS NOT NULL THEN
            CASE WHEN hold_change."quantityChanged" > 0 THEN '${ChangeType.HELD}'
                 ELSE '${ChangeType.RELEASED}' END
          WHEN split_change.id IS NOT NULL THEN '${ChangeType.SPLITTED}'
          WHEN merge_change.id IS NOT NULL THEN '${ChangeType.MERGED}'
          WHEN allocate_change.id IS NOT NULL THEN
            CASE WHEN allocate_change."quantityChanged" > 0 THEN '${ChangeType.ALLOCATED}'
                 ELSE '${ChangeType.DEALLOCATED}' END
          WHEN reclassify_change.id IS NOT NULL THEN '${ChangeType.RECLASSIFIED}'
          WHEN scrape_change.id IS NOT NULL THEN '${ChangeType.SCRAPED}'
          ELSE NULL
        END`,
        'changeType',
      );

    // The id tiebreaker is what keeps two pages from overlapping when several
    // rows share a timestamp, which a multi-line order always produces.
    const items = await resultQueryBuilder
      .addOrderBy('stock."createdAt"', 'DESC')
      .addOrderBy('stock.id', 'ASC')
      .getRawMany<ChangeLog>();

    return [items, count];
  }
}
