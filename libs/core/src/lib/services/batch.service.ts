import { Inject, Injectable } from '@nestjs/common';
import {
  DataSource,
  EntityManager,
  EntityTarget,
  FindOperator,
  FindOptionsWhere,
  IsNull,
  Raw,
  Repository,
} from 'typeorm';
import { BatchEntity, BatchEntityClass } from '../models';
import { FindBatchInput } from '../typings/find-batch.input';
import { GetBatchInput, SplitBatchInput } from '../typings/get-batch.input';
import {
  BatchGroupEntity,
  BatchGroupEntityClass,
} from '../models/metadata/batch-group.entity';

@Injectable()
export class BatchService<T extends BatchEntityClass = BatchEntityClass> {
  readonly batchRepository: Repository<T>;
  readonly batchGroupRepository: Repository<BatchGroupEntityClass>;
  constructor(
    private readonly dataSource: DataSource,
    @Inject(BatchEntity) readonly batchEntity: EntityTarget<T>,
    @Inject(BatchGroupEntity)
    readonly batchGroupEntity: EntityTarget<BatchGroupEntityClass>,
  ) {
    this.batchRepository = this.dataSource.getRepository<T>(this.batchEntity);
    this.batchGroupRepository =
      this.dataSource.getRepository<BatchGroupEntityClass>(
        this.batchGroupEntity,
      );
  }

  /**
   * Validates batch state transition based on hierarchy:
   * inShipment = held = transferId = vendorId = customerId > saleId+saleSerialId > inspectionResult
   *
   * - Top tier (terminal): inShipment, held, transferId, vendorId, customerId → no state change allowed
   * - Middle tier: saleId+saleSerialId → can only go UP to top tier
   * - Bottom tier: inspectionResult → can go UP to middle or top tier, but cannot change inspectionResult
   */
  private validateStateTransition(
    batch: BatchEntityClass,
    options: SplitBatchInput,
  ): void {
    // Check if trying to clear/release a top-tier state
    const isReleasingInShipment =
      batch.inShipment === true && options.inShipment === false;
    const isReleasingHeld = batch.held === true && options.held === false;
    const isReleasingTransfer =
      batch.transferId != null && options.transferId === null;
    const isReleasingVendor =
      batch.vendorId != null && options.vendorId === null;
    const isReleasingCustomer =
      batch.customerId != null && options.customerId === null;

    const isReleasing =
      isReleasingInShipment ||
      isReleasingHeld ||
      isReleasingTransfer ||
      isReleasingVendor ||
      isReleasingCustomer;

    // Determine current state tier
    const isTopTier =
      batch.inShipment === true ||
      batch.held === true ||
      batch.transferId != null ||
      batch.vendorId != null ||
      batch.customerId != null;

    const isMiddleTier = batch.saleId != null || batch.saleSerialId != null;

    // What is being changed (explicitly set, not undefined)
    const changingMiddleTier =
      options.saleId !== undefined || options.saleSerialId !== undefined;

    const changingInspection = options.inspectionResult !== undefined;

    // Rule 1: Top tier is terminal unless explicitly releasing that state
    if (isTopTier && !isReleasing) {
      const state = batch.inShipment
        ? 'in shipment'
        : batch.held
          ? 'held'
          : batch.transferId
            ? 'in transfer'
            : batch.vendorId
              ? 'vendor inventory'
              : 'customer inventory';
      throw new Error(
        `Batch is ${state}, cannot transition to other states. Only release is allowed.`,
      );
    }

    // Rule 2: Middle tier cannot change to same tier
    if (isMiddleTier && changingMiddleTier) {
      throw new Error(
        'Cannot modify allocation (saleId/saleSerialId) for already allocated batch',
      );
    }

    // Rule 3: Cannot change inspection result after it's set (unless releasing to higher tier)
    if (
      batch.inspectionResult != null &&
      !isMiddleTier &&
      !isTopTier &&
      changingInspection
    ) {
      throw new Error('Inspection result already set, cannot modify');
    }
  }

  /**
   * Find the unsplit batch carrying `key` for this material, or create it.
   *
   * `parentBatchId` and `attributes` are write-on-create only: the lookup still
   * matches on key, material and the unsplit condition alone, so a caller that
   * passes them for a key that already exists gets the existing batch back
   * untouched. `key` is the batch's identity in this model — `batches` carries
   * `UNIQUE (key, materialId)`, so there is exactly one row per key — and
   * attributes describe a batch rather than distinguish one. A host that needs
   * two distinct batches gives them two keys; asking for two here fails on the
   * constraint.
   *
   * Deliberately **not** filtered on `requiresInspection`: a receipt awaiting
   * inspection may flag the batch in place, and the flag must not then hide the
   * key from the next lookup — which, given the unique constraint, would leave
   * it trying to create a duplicate.
   */
  async getBatch({
    manager = this.dataSource.manager,
    ...options
  }: GetBatchInput & { manager?: EntityManager }): Promise<T> {
    const batchRepository = manager.getRepository<BatchEntityClass>(
      this.batchEntity,
    );
    const batchGroupRepository = manager.getRepository(this.batchGroupEntity);
    const unsplittedCondition: FindOptionsWhere<BatchEntityClass> = {
      saleId: IsNull(),
      saleSerialId: IsNull(),
      customerId: IsNull(),
      vendorId: IsNull(),
      transferId: IsNull(),
      inspectionResult: IsNull(),
      held: false,
      inShipment: false,
    };

    const existed = await batchRepository.findOneBy({
      ...unsplittedCondition,
      key: options.key,
      materialId: options.materialId,
    });
    if (existed) return existed as T;

    const batchGroup = await batchGroupRepository.save(
      batchGroupRepository.create({
        key: options.key,
        materialId: options.materialId,
      }),
    );
    const batch = await batchRepository.save(
      batchRepository.create({
        ...options,
        groupId: batchGroup.id,
      }),
    );
    return batch as T;
  }

  async splitBatch({
    manager = this.dataSource.manager,
    ...options
  }: {
    id: string;
    manager?: EntityManager;
  } & SplitBatchInput): Promise<BatchEntityClass> {
    const batchRepository = manager.getRepository<BatchEntityClass>(
      this.batchEntity,
    );
    const batch = await batchRepository.findOneOrFail({
      where: { id: options.id },
      relations: { batchGroup: true },
    });

    // Validate state transition before proceeding
    this.validateStateTransition(batch, options);

    // Create merged batch object with new metrics
    const mergedBatch = {
      ...batch,
      ...options,
      groupId: batch.batchGroup.id,
    };

    /*
     * Absent attributes have to be matched with `IsNull()`, not with a bare
     * `null`. A `null` on the right of a find condition compiles to `= NULL`,
     * which is never true in SQL — so this lookup used to miss every batch whose
     * attributes were unset and split off a duplicate instead of reusing the one
     * already there. `getBatch` above has always done it this way; this call
     * site did not. TypeORM 1.x refuses a bare `null` here outright, which is
     * how the bug surfaced.
     */
    const orNull = <V>(value: V | null | undefined): V | FindOperator<V> =>
      value === null || value === undefined ? IsNull() : value;

    const whereCondition: FindOptionsWhere<BatchEntityClass> = {
      groupId: mergedBatch.groupId,
      saleId: orNull(mergedBatch.saleId),
      saleSerialId: orNull(mergedBatch.saleSerialId),
      customerId: orNull(mergedBatch.customerId),
      vendorId: orNull(mergedBatch.vendorId),
      inspectionResult: orNull(mergedBatch.inspectionResult),
      transferId: orNull(mergedBatch.transferId),
      held: mergedBatch.held ?? false,
      inShipment: mergedBatch.inShipment ?? false,
      // Part of the batch's identity: material waiting on an inspection must
      // not be merged back into the free stock it was split away from.
      requiresInspection: mergedBatch.requiresInspection ?? false,
      /*
       * Attributes take part in the identity check, so a split that asks for
       * `{ bin: 'B1' }` never lands on the sibling holding `{ bin: 'B2' }`.
       * Compared as `jsonb`, whose equality is by content rather than by the
       * text of the document, so key order and whitespace do not matter — which
       * a plain string comparison on the serialized column would get wrong.
       */
      attributes:
        mergedBatch.attributes === null || mergedBatch.attributes === undefined
          ? IsNull()
          : Raw((alias) => `${alias} = cast(:batchAttributes as jsonb)`, {
              batchAttributes: JSON.stringify(mergedBatch.attributes),
            }),
    };

    // Check if a batch with these exact metrics already exists in the same group
    const existingBatch = await batchRepository.findOne({
      where: whereCondition,
    });

    if (existingBatch) {
      return existingBatch as T;
    }

    // If no matching batch exists, create a new one
    return batchRepository.save(
      batchRepository.create({
        ...mergedBatch,
        key: `${batch.batchGroup.key}_${Date.now().toString()}`,
        // Not inherited from `mergedBatch`: spreading the source batch would
        // copy *its* parent and flatten the chain by one link. The parent of
        // the batch being created is the batch it was split out of.
        parentBatchId: batch.id,
        id: undefined,
      }),
    );
  }

  async findMany(options: FindBatchInput<T>) {
    const queryBuilder = this.batchGroupRepository.createQueryBuilder('batch');

    if (options.wildcard) {
      const { key, value } = options.wildcard;
      queryBuilder.andWhere(`batch."${String(key)}" ILIKE :value`, {
        value: `%${value}%`,
      });
    }
    if (options.materialId)
      queryBuilder.andWhere('batch."materialId" = :materialId', {
        materialId: options.materialId,
      });

    if (options.offset !== undefined && options.offset >= 0)
      queryBuilder.skip(options.offset);

    if (options.limit !== undefined && options.limit > 0)
      queryBuilder.take(options.limit);

    return queryBuilder.getManyAndCount();
  }
}
