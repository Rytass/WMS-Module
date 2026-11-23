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
  AggregatedStockSortField,
  FindAggregatedStockInput,
  FindStockGroupedByMaterialInput,
  StockGroupedByMaterialSortField,
} from '../typings/find-stock-sort.input';
import { SortOrder } from '../typings/list-sort';
import { applyListSort } from '../utils/list-sort';
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
  BatchGroupEntityClass,
  LoadersEntityClass,
  LoaderTypeEntityClass,
  LocationEntityClass,
  UnitEntityClass,
} from '../models';
import {
  ChangeLogSortField,
  FindChangeLogInput,
} from '../typings/find-change-log.input';
import { WMS_CORE_MODULE_OPTIONS } from '../typings/core-module-options';
import type { WmsModuleCoreModuleOptions } from '../typings/core-module-options';
import { WmsEntities } from '../models/wms-entities';
import { quotedTablePathOf, tablePathOf } from '../utils/table-path';
import { getWmsTablePrefix } from '../table-prefix/logical-table-name';

/**
 * ORDER BY expressions for `findAggregatedStocks`, over the outer query: the
 * aggregated subquery is `agg`, and the joins a field needs are added by
 * `joinAggregatedStockSortTarget` under the `sort_*` aliases.
 */
const AGGREGATED_STOCK_SORT_FIELDS: Readonly<
  Record<AggregatedStockSortField, string>
> = {
  [AggregatedStockSortField.STATUS]: 'agg.status',
  [AggregatedStockSortField.MATERIAL_KEY]: 'sort_material."key"',
  [AggregatedStockSortField.MATERIAL_DESCRIPTION]:
    'sort_material."description"',
  [AggregatedStockSortField.BATCH_KEY]: 'sort_batch_group."key"',
  [AggregatedStockSortField.LOCATION_KEY]: 'sort_location."key"',
  [AggregatedStockSortField.LOADER_SERIAL_ID]: 'sort_loader."serialId"',
  [AggregatedStockSortField.QUANTITY]: 'agg.quantity',
  [AggregatedStockSortField.BASE_UNIT]: 'sort_unit."key"',
  [AggregatedStockSortField.VENDOR_ID]: 'agg."vendorId"',
  [AggregatedStockSortField.CUSTOMER_ID]: 'agg."customerId"',
  [AggregatedStockSortField.SALE_ID]: 'agg."saleId"',
  [AggregatedStockSortField.SALE_SERIAL_ID]: 'agg."saleSerialId"',
};

/**
 * What identifies an aggregated row, in the order the list has always used.
 * The batch columns grouped alongside are functionally dependent on `batchId`,
 * so these five are unique per row.
 */
const AGGREGATED_STOCK_GROUP_KEY = [
  'agg."materialId"',
  'agg."batchId"',
  'agg."locationId"',
  'agg."loaderId"',
  'agg.status',
] as const;

/** The parameter TypeORM gives a single-table child's discriminator values. */
const TYPEORM_DISCRIMINATOR_PARAMETER = 'discriminatorColumnValues';
/** Its renamed copy inside `findManyGroupedByMaterialId`'s stock subquery. */
const STOCK_DISCRIMINATOR_PARAMETER = 'stockDiscriminatorColumnValues';

/** ORDER BY expressions for `findManyGroupedByMaterialId`. */
const STOCK_GROUPED_BY_MATERIAL_SORT_FIELDS: Readonly<
  Record<StockGroupedByMaterialSortField, string>
> = {
  [StockGroupedByMaterialSortField.MATERIAL_KEY]: 'material."key"',
  [StockGroupedByMaterialSortField.MATERIAL_DESCRIPTION]:
    'material."description"',
  [StockGroupedByMaterialSortField.QUANTITY]: 'totals.quantity',
  [StockGroupedByMaterialSortField.BASE_UNIT]: 'sort_unit."key"',
};

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
              // The entity, not its table path: a schema-qualified path such as
              // `app.wms_batches` reads to TypeORM as `<alias>.<relation>`
              // in a join and fails with `"app" alias was not found`.
              .innerJoin(this.entities.batch, 'b', 's."batchId" = b.id'),
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

  /** The `relocateEmptyLoaders` module option; `false` unless set. */
  get relocateEmptyLoaders(): boolean {
    return this.coreOptions.relocateEmptyLoaders ?? false;
  }

  /**
   * Take a row lock on each loader, in id order, through `manager`.
   *
   * Where a loader sits is decided by reading its row (`resolveLoaderPlacement`,
   * the whole-loader gates) and then acting on that answer; without the lock a
   * whole-loader move and a consolidation onto the same loader both read the old
   * location, both pass, and the loader ends up away from half of its stock.
   *
   * LOCK ORDER (project-wide): loader row locks first, then the advisory stock
   * locks (`lockStockSlots` / `validateStockAvailability`), then the
   * batch-group lock (`splitBatch`). Never take a loader lock after either of
   * the others. Loaders among themselves are taken sorted by id.
   */
  async lockLoaders(
    loaderIds: readonly string[],
    manager: EntityManager,
  ): Promise<void> {
    const repository = manager.getRepository(LoadersEntityClass);

    for (const id of [...new Set(loaderIds)].sort()) {
      await repository.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
        loadEagerRelations: false,
        relationLoadStrategy: 'query',
      });
    }
  }

  /**
   * Whether a loader carries no stock at all: no (material, batch, location)
   * slot on it holds a non-zero quantity. Slots are judged one by one, so a
   * +5 and a -5 in different slots (stock that is out of step with itself) do
   * not cancel into "empty". Read through `manager` so it sees the caller's own
   * uncommitted writes.
   */
  async isLoaderEmpty(
    loaderId: string,
    manager: EntityManager,
  ): Promise<boolean> {
    const rows = await manager
      .getRepository<T>(this.stockEntity)
      .createQueryBuilder('stock')
      .select('stock."materialId"', 'materialId')
      .addSelect('stock."batchId"', 'batchId')
      .addSelect('stock."locationId"', 'locationId')
      .where('stock."loaderId" = :loaderId', { loaderId })
      .groupBy('stock."materialId"')
      .addGroupBy('stock."batchId"')
      .addGroupBy('stock."locationId"')
      .having('SUM(stock.quantity) <> 0')
      .limit(1)
      .getRawMany();

    return rows.length === 0;
  }

  /**
   * Decide whether stock may be placed on `loaderId` at `locationId`.
   *
   * Returns `'in-place'` when the loader already sits there, `'relocate'` when
   * it sits elsewhere but is empty and `relocateEmptyLoaders` is on (the caller
   * then moves the loader), and throws otherwise -- a loader with stock at
   * another location must never be pulled away from that stock.
   *
   * Takes the loader's row lock first (held to the end of the caller's
   * transaction), so the answer cannot be overtaken by a concurrent move of the
   * same loader. Call it before any stock lock; see `lockLoaders`.
   */
  async resolveLoaderPlacement(
    loaderId: string,
    locationId: string,
    manager: EntityManager,
  ): Promise<'in-place' | 'relocate'> {
    await this.lockLoaders([loaderId], manager);

    const loader = await manager
      .getRepository(LoadersEntityClass)
      .findOneByOrFail({ id: loaderId });

    if (loader.locationId === locationId) return 'in-place';

    if (
      this.relocateEmptyLoaders &&
      (await this.isLoaderEmpty(loaderId, manager))
    ) {
      return 'relocate';
    }

    throw new Error(
      `Loader ${loaderId} is at location ${loader.locationId}, not ${locationId}, so stock cannot be placed on it there${
        this.relocateEmptyLoaders
          ? ' (the loader still holds stock)'
          : ' (enable relocateEmptyLoaders to move an empty loader)'
      }`,
    );
  }

  /**
   * Narrows to the stock a scanned label names, matching keys exactly with
   * material → batch → location precedence (see `FindStockInput.scanCode`).
   *
   * One SQL predicate rather than three look-ups first: it keeps this a plain
   * filter on whatever builder the caller passes (so it composes with every
   * other filter and with pagination), and it needs no extra round trip.
   * Tables come from the configured entities, never a literal, so a prefixed or
   * overridden table is the one read.
   */
  private applyScanCode<U extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<U>,
    scanCode: string,
  ): void {
    /*
     * Hand-written rather than `subQuery().from(entity)`: TypeORM appends the
     * single-table discriminator to a sub-select of an overridable entity, so a
     * host's subclass rows (or ours, under a host's override) would silently
     * fall outside it. Same reasoning as the hand-written key joins below.
     */
    const keyIds = (entity: EntityTarget<ObjectLiteral>): string => {
      const metadata = this.dataSource.getMetadata(entity);
      const notDeleted = metadata.deleteDateColumn
        ? ` AND "${metadata.deleteDateColumn.databaseName}" IS NULL`
        : '';

      return `(SELECT "id" FROM ${quotedTablePathOf(this.dataSource, entity)} WHERE "key" = :scanCode${notDeleted})`;
    };

    const materialIds = keyIds(this.materialEntity);
    const locationIds = keyIds(this.entities.location);

    /*
     * A batch label carries the batch *group* key: acting on part (or all) of
     * a batch splits a child off as `<group key>_<timestamp>`, and every screen
     * shows the group key for it. Matching `batches.key` alone made a batch
     * unscannable the moment it was held, transferred or shipped. So the code
     * names every batch of its group; a child key typed in full still matches
     * that one batch.
     */
    const batchMetadata = this.dataSource.getMetadata(this.entities.batch);
    const batchNotDeleted = batchMetadata.deleteDateColumn
      ? ` AND b."${batchMetadata.deleteDateColumn.databaseName}" IS NULL`
      : '';
    const batchIds = `(SELECT b."id" FROM ${quotedTablePathOf(this.dataSource, this.entities.batch)} b WHERE (b."key" = :scanCode OR b."groupId" IN (SELECT g."id" FROM ${quotedTablePathOf(this.dataSource, BatchGroupEntityClass)} g WHERE g."key" = :scanCode))${batchNotDeleted})`;

    const byPrecedence = [
      `stock."materialId" IN ${materialIds}`,
      `(NOT EXISTS ${materialIds} AND stock."batchId" IN ${batchIds})`,
      `(NOT EXISTS ${materialIds} AND NOT EXISTS ${batchIds} AND stock."locationId" IN ${locationIds})`,
    ].join(' OR ');

    queryBuilder.andWhere(`(${byPrecedence})`, { scanCode });
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

    if (options.scanCode) this.applyScanCode(queryBuilder, options.scanCode);

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
      // The entity, not its table path — see `selectQueryBuilder`.
      queryBuilder.innerJoin(
        this.entities.batch,
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

  /**
   * Materials with stock, one page of them, in one statement.
   *
   * A material is listed when any of its (material, batch, location, loader,
   * status) positions nets to non-zero after the filters — the aggregated
   * subquery's `HAVING` — not when the material's own total does: +5 in one
   * place and -5 in another is listed. Soft-deleted materials are left out
   * (the material repository is the main alias).
   *
   * The positions are summed per material in the database, joined to the
   * material, sorted and paged there; `total` comes from a window count on the
   * same statement. Only a page past the end, which has no row to carry it,
   * costs a second query.
   */
  async findManyGroupedByMaterialId(
    options: FindStockGroupedByMaterialInput<T>,
  ): Promise<[K[], number]> {
    const { sort, offset, limit, ...filters } = options;
    const aggregateSubquery = this.pipeSelectOptionsToQueryBuilder(
      filters as FindStockInput<T>,
      this.selectQueryBuilder('stock'),
      true,
    );

    /*
     * Both the stock subquery and the material main alias are single-table
     * children, and TypeORM names *every* discriminator parameter
     * `discriminatorColumnValues`. Embedded as is, the outer query's value
     * (the material's) would overwrite the inner one and the stock filter would
     * match nothing — so the inner placeholder gets a name of its own.
     */
    const {
      [TYPEORM_DISCRIMINATOR_PARAMETER]: stockDiscriminatorValues,
      ...aggregateParameters
    } = aggregateSubquery.getParameters();
    const aggregateSql = aggregateSubquery
      .getQuery()
      .split(`:...${TYPEORM_DISCRIMINATOR_PARAMETER}`)
      .join(`:...${STOCK_DISCRIMINATOR_PARAMETER}`);

    const queryBuilder = (): SelectQueryBuilder<K> =>
      this.dataSource
        .getRepository<K>(this.materialEntity)
        .createQueryBuilder('material')
        .innerJoin(
          (subQuery) =>
            subQuery
              .select('agg."materialId"', 'materialId')
              .addSelect('SUM(agg.quantity)', 'quantity')
              .from(`(${aggregateSql})`, 'agg')
              .groupBy('agg."materialId"'),
          'totals',
          'totals."materialId" = material.id',
        )
        .setParameters({
          ...aggregateParameters,
          ...(stockDiscriminatorValues === undefined
            ? {}
            : { [STOCK_DISCRIMINATOR_PARAMETER]: stockDiscriminatorValues }),
        });

    const pageBuilder = queryBuilder().addSelect('COUNT(*) OVER ()', 'total');

    // `materials.baseUnit` holds the unit's id, so its key needs a join; one
    // unit per material, so the join keeps one row per material.
    if (sort?.field === StockGroupedByMaterialSortField.BASE_UNIT) {
      pageBuilder.leftJoin(
        UnitEntityClass,
        'sort_unit',
        'CAST(sort_unit.id AS text) = material."baseUnit"',
      );
    }

    applyListSort(pageBuilder, {
      sort,
      fields: STOCK_GROUPED_BY_MATERIAL_SORT_FIELDS,
      defaultOrder: {
        field: StockGroupedByMaterialSortField.MATERIAL_KEY,
        order: SortOrder.ASC,
      },
      tiebreaker: 'material.id',
      mode: 'raw',
    });

    // `totals` is one row per material, so LIMIT/OFFSET cut whole materials.
    if (offset !== undefined && offset >= 0) pageBuilder.offset(offset);
    if (limit !== undefined && limit > 0) pageBuilder.limit(limit);

    const { entities, raw } = await pageBuilder.getRawAndEntities<{
      total: string;
    }>();

    if (raw.length) return [entities, parseInt(raw[0].total, 10)];
    if (!offset) return [[], 0];

    return [[], await queryBuilder().getCount()];
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

  /**
   * Join what a sort field of `findAggregatedStocks` orders by, and nothing
   * else: an unsorted call (every internal caller) keeps its plain query.
   * Each join is on a primary key, so the outer query stays one row per
   * aggregated position and LIMIT/OFFSET still cut whole rows. Entities, not
   * table names, so a table prefix and an overridden entity both follow.
   */
  private joinAggregatedStockSortTarget<U extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<U>,
    field: AggregatedStockSortField,
  ): void {
    switch (field) {
      case AggregatedStockSortField.MATERIAL_KEY:
      case AggregatedStockSortField.MATERIAL_DESCRIPTION:
        queryBuilder.leftJoin(
          this.materialEntity,
          'sort_material',
          'sort_material.id = agg."materialId"',
        );
        break;
      case AggregatedStockSortField.BASE_UNIT:
        queryBuilder
          .leftJoin(
            this.materialEntity,
            'sort_material',
            'sort_material.id = agg."materialId"',
          )
          .leftJoin(
            UnitEntityClass,
            'sort_unit',
            'CAST(sort_unit.id AS text) = sort_material."baseUnit"',
          );
        break;
      case AggregatedStockSortField.BATCH_KEY:
        // What `batch { key }` shows is the batch *group*'s key.
        queryBuilder
          .leftJoin(
            this.entities.batch,
            'sort_batch',
            'sort_batch.id = agg."batchId"',
          )
          .leftJoin(
            BatchGroupEntityClass,
            'sort_batch_group',
            'CAST(sort_batch_group.id AS text) = CAST(sort_batch."groupId" AS text)',
          );
        break;
      case AggregatedStockSortField.LOCATION_KEY:
        queryBuilder.leftJoin(
          this.entities.location,
          'sort_location',
          'sort_location.id = agg."locationId"',
        );
        break;
      case AggregatedStockSortField.LOADER_SERIAL_ID:
        // `stocks.loaderId` is varchar, `loaders.id` uuid.
        queryBuilder.leftJoin(
          LoadersEntityClass,
          'sort_loader',
          'CAST(sort_loader.id AS text) = agg."loaderId"',
        );
        break;
      default:
        // Columns of the aggregated row itself.
        break;
    }
  }

  async findAggregatedStocks(
    options: FindAggregatedStockInput<T>,
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

    // A raw query pages with offset/limit, never skip/take: TypeORM drops
    // skip/take without a word as soon as the builder gains a join. An
    // aggregated row has no id, so the tiebreaker is the group key itself --
    // (material, batch, location, loader) plus the derived status -- which is
    // what makes a row unique here; without a total order LIMIT/OFFSET pages
    // can repeat or skip rows.
    if (options.sort) {
      this.joinAggregatedStockSortTarget(
        paginatedQueryBuilder,
        options.sort.field,
      );
      applyListSort(paginatedQueryBuilder, {
        sort: options.sort,
        fields: AGGREGATED_STOCK_SORT_FIELDS,
        defaultOrder: options.sort,
        tiebreaker: AGGREGATED_STOCK_GROUP_KEY,
        mode: 'raw',
      });
    } else {
      // The order this list has always had, kept verbatim (NULLS FIRST
      // included) so callers paging without a sort see no change.
      paginatedQueryBuilder
        .orderBy('agg."materialId"', 'ASC')
        .addOrderBy('agg."batchId"', 'ASC')
        .addOrderBy('agg."locationId"', 'ASC', 'NULLS FIRST')
        .addOrderBy('agg."loaderId"', 'ASC', 'NULLS FIRST')
        .addOrderBy('agg.status', 'ASC', 'NULLS FIRST');
    }

    if (options.offset !== undefined && options.offset >= 0) {
      paginatedQueryBuilder.offset(options.offset);
    }
    if (options.limit !== undefined && options.limit > 0) {
      paginatedQueryBuilder.limit(options.limit);
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
    options: FindChangeLogInput<T>,
  ): Promise<[ChangeLog[], number]> {
    const { sort, ...filters } = options;
    // Our own change tables, named as they ended up under `withWmsTablePrefix`.
    const prefix = getWmsTablePrefix();

    // Build base query with all change entity joins
    const changesQueryBuilder = this.pipeSelectOptionsToQueryBuilder(
      { ...filters, offset: undefined, limit: undefined },
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

    // Also the ORDER BY for CHANGE_TYPE: PostgreSQL accepts an output alias
    // in ORDER BY only on its own, never inside an expression.
    const changeTypeSql = `CASE
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
        END`;

    // Explicitly select only the fields needed for ChangeLog
    resultQueryBuilder
      .select('stock.id', 'id')
      .addSelect('stock.quantity', 'quantity')
      .addSelect('stock_status.status', 'status')
      .addSelect('stock."materialId"', 'materialId')
      .addSelect('stock."batchId"', 'batchId')
      .addSelect('stock."locationId"', 'locationId')
      .addSelect('stock."loaderId"', 'loaderId')
      .addSelect(changeTypeSql, 'changeType');

    // Joined only for the column asked for, by entity (the overridable ones
    // through `WmsEntities`) so the table prefix applies; every join is on a
    // primary key, so no row is multiplied. Aliases avoid the filter joins'.
    if (
      sort?.field === ChangeLogSortField.MATERIAL_KEY ||
      sort?.field === ChangeLogSortField.MATERIAL_DESCRIPTION ||
      sort?.field === ChangeLogSortField.BASE_UNIT
    ) {
      resultQueryBuilder.leftJoin(
        this.entities.material,
        'cl_material',
        'cl_material.id = stock."materialId"',
      );
    }

    if (sort?.field === ChangeLogSortField.BASE_UNIT) {
      resultQueryBuilder.leftJoin(
        UnitEntityClass,
        'cl_unit',
        'CAST(cl_unit.id AS text) = cl_material."baseUnit"',
      );
    }

    if (sort?.field === ChangeLogSortField.BATCH_KEY) {
      resultQueryBuilder.leftJoin(
        this.entities.batch,
        'cl_batch',
        'cl_batch.id = stock."batchId"',
      );
    }

    if (sort?.field === ChangeLogSortField.LOCATION_KEY) {
      resultQueryBuilder.leftJoin(
        this.entities.location,
        'cl_location',
        'cl_location.id = stock."locationId"',
      );
    }

    const changeTypeRank = `(CASE ${changeTypeSql} ${Object.values(ChangeType)
      .map((type, rank) => `WHEN '${type}' THEN ${rank}`)
      .join(' ')} END)`;

    // The id tiebreaker is what keeps two pages from overlapping when several
    // rows share a timestamp, which a multi-line order always produces.
    applyListSort(resultQueryBuilder, {
      sort,
      fields: {
        [ChangeLogSortField.CHANGE_TYPE]: changeTypeRank,
        [ChangeLogSortField.MATERIAL_KEY]: 'cl_material.key',
        [ChangeLogSortField.MATERIAL_DESCRIPTION]: 'cl_material.description',
        [ChangeLogSortField.BATCH_KEY]: 'cl_batch.key',
        [ChangeLogSortField.LOCATION_KEY]: 'cl_location.key',
        // The magnitude, as `changeLogs` displays it: the sign is the change
        // type's to carry, and sorting it would put every outflow first.
        [ChangeLogSortField.QUANTITY]: 'ABS(stock.quantity)',
        [ChangeLogSortField.BASE_UNIT]: 'cl_unit.key',
        [ChangeLogSortField.CREATED_AT]: 'stock."createdAt"',
      },
      defaultOrder: {
        field: ChangeLogSortField.CREATED_AT,
        order: SortOrder.DESC,
      },
      tiebreaker: 'stock.id',
      mode: 'raw',
    });

    const items = await resultQueryBuilder.getRawMany<ChangeLog>();

    return [items, count];
  }
}
