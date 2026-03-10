import { Inject, Injectable } from '@nestjs/common';
import { DataSource, EntityManager, EntityTarget, Repository } from 'typeorm';
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
  constructor(
    private readonly dataSource: DataSource,
    @Inject(BatchEntity) readonly batchEntity: EntityTarget<T>,
    @Inject(BatchGroupEntity)
    readonly batchGroupEntity: EntityTarget<BatchGroupEntityClass>,
  ) {
    this.batchRepository = this.dataSource.getRepository<T>(this.batchEntity);
  }

  async getBatch({
    manager = this.dataSource.manager,
    ...options
  }: GetBatchInput & { manager?: EntityManager }): Promise<T> {
    const batchRepository = manager.getRepository(BatchEntityClass);
    const batchGroupRepository = manager.getRepository(this.batchGroupEntity);
    const existed = await batchRepository.findOneBy({
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
  } & SplitBatchInput): Promise<T> {
    const batchRepository = manager.getRepository(BatchEntityClass);
    const batch = await batchRepository.findOneOrFail({
      where: { id: options.id },
      relations: ['batchGroup'],
    });

    console.log(
      batchRepository.create({
        ...batch,
        ...options,
        groupId: batch.batchGroup.id,
        key: `${batch.key}_${Date.now().toString()}`,
        id: undefined,
      }),
    );
    return batchRepository.save(
      batchRepository.create({
        ...batch,
        ...options,
        groupId: batch.batchGroup.id,
        key: `${batch.key}_${Date.now().toString()}`,
        id: undefined,
      }),
    ) as Promise<T>;
  }

  async findMany(options: FindBatchInput<T>) {
    const queryBuilder = this.batchRepository.createQueryBuilder('batch');

    if (options.wildcard) {
      const { key, value } = options.wildcard;
      queryBuilder.andWhere(`batch."${String(key)}" ILIKE :value`, {
        value: `%${value}%`,
      });
    }
    if (options.offset !== undefined && options.offset >= 0)
      queryBuilder.skip(options.offset);

    if (options.limit !== undefined && options.limit > 0)
      queryBuilder.take(options.limit);

    return queryBuilder.getManyAndCount();
  }
}
