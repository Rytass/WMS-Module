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
    // Determine current state tier
    const isTopTier =
      batch.inShipment === true ||
      batch.held === true ||
      batch.transferId != null ||
      batch.vendorId != null ||
      batch.customerId != null;

    const isMiddleTier = batch.saleId != null || batch.saleSerialId != null;

    const hasInspection = batch.inspectionResult != null;

    // What is being changed (explicitly set, not undefined)
    const changingMiddleTier =
      options.saleId !== undefined || options.saleSerialId !== undefined;

    const changingInspection = options.inspectionResult !== undefined;

    // Rule 1: Top tier is terminal - no state transition allowed
    if (isTopTier) {
      const state = batch.inShipment
        ? 'in shipment (can only ship)'
        : batch.held
          ? 'held (can only release)'
          : batch.transferId
            ? 'in transfer (can only complete transfer)'
            : batch.vendorId
              ? 'vendor inventory (can only return)'
              : 'customer inventory (can only return)';
      throw new Error(`Batch is ${state}, no state transition allowed`);
    }

    // Rule 2: Middle tier cannot change to same or lower tier
    if (isMiddleTier) {
      if (changingMiddleTier) {
        throw new Error(
          'Cannot modify allocation (saleId/saleSerialId) for already allocated batch',
        );
      }
      if (changingInspection) {
        throw new Error('Cannot modify inspection result for allocated batch');
      }
      // Can transition to top tier - no validation needed
    }

    // Rule 3: Has inspection result cannot change it (unless already at higher tier)
    if (hasInspection && !isMiddleTier && !isTopTier) {
      if (changingInspection) {
        throw new Error('Inspection result already set, cannot modify');
      }
      // Can transition to middle or top tier - no validation needed
    }
  }

  async getBatch({
    manager = this.dataSource.manager,
    ...options
  }: GetBatchInput & { manager?: EntityManager }): Promise<T> {
    const batchRepository = manager.getRepository(BatchEntityClass);
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
    const batchRepository = manager.getRepository(BatchEntityClass);
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
