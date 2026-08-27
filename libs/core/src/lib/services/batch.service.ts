import { Inject, Injectable } from '@nestjs/common';
import {
  DataSource,
  EntityManager,
  EntityTarget,
  FindOptionsWhere,
  IsNull,
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

  async getBatch({
    manager = this.dataSource.manager,
    ...options
  }: GetBatchInput & { manager?: EntityManager }): Promise<T> {
    const batchRepository = manager.getRepository<BatchEntityClass>(this.batchEntity);
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
    const batchRepository = manager.getRepository<BatchEntityClass>(this.batchEntity);
    const batch = await batchRepository.findOneOrFail({
      where: { id: options.id },
      relations: ['batchGroup'],
    });

    // Validate state transition before proceeding
    this.validateStateTransition(batch, options);

    // Create merged batch object with new metrics
    const mergedBatch = {
      ...batch,
      ...options,
      groupId: batch.batchGroup.id,
    };

    // Build where condition dynamically to handle optional fields
    const whereCondition: Record<string, unknown> = {
      groupId: mergedBatch.groupId,
      saleId: mergedBatch.saleId ?? null,
      saleSerialId: mergedBatch.saleSerialId ?? null,
      customerId: mergedBatch.customerId ?? null,
      vendorId: mergedBatch.vendorId ?? null,
      inspectionResult: mergedBatch.inspectionResult ?? null,
      transferId: mergedBatch.transferId ?? null,
      held: mergedBatch.held ?? false,
      inShipment: mergedBatch.inShipment ?? false,
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
