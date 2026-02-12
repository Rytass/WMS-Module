import { Inject, Injectable } from '@nestjs/common';
import { BatchEntity as BatchBaseEntity } from '@rytass/wms-base-nestjs-module';
import { DataSource, EntityTarget, Repository } from 'typeorm';
import { BatchEntity } from '../models';
import { FindBatchInput } from '../typings/find-batch.input';

@Injectable()
export class BatchService<T extends BatchBaseEntity = BatchBaseEntity> {
  readonly batchRepository: Repository<T>;
  constructor(
    private readonly dataSource: DataSource,
    @Inject(BatchEntity) readonly batchEntity: EntityTarget<T>,
  ) {
    this.batchRepository = this.dataSource.getRepository<T>(this.batchEntity);
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
