import { Inject, Injectable } from '@nestjs/common';
import {
  EntityManager,
  type EntityTarget,
  In,
  Repository,
  DataSource,
} from 'typeorm';
import {
  LoadersEntity,
  LoadersEntityClass,
} from '../models/metadata/loader.entity';
import {
  LoaderTypeEntity,
  LoaderTypeEntityClass,
} from '../models/metadata/loader-type.entity';
import {
  CreateLoaderInput,
  UpdateLoaderInput,
} from '../typings/create-loader.input';
import {
  CreateLoaderTypeInput,
  UpdateLoaderTypeInput,
} from '../typings/create-loader-type.input';
import {
  FindLoaderInput,
  FindLoaderTypeInput,
} from '../typings/find-loader.input';
import { runInTransaction } from '../utils/run-in-transaction';
import { WmsSequenceService } from './sequence.service';
import { WmsEntities } from '../models/wms-entities';
import { quotedTablePathOf } from '../utils/table-path';
import { LoaderUnitEntity, LoaderUnitEntityClass } from '../models';

/**
 * Service for managing loaders and their types
 * Supports dynamic entity injection for customization
 * T - Loader entity type
 * K - Loader Type entity type
 */
@Injectable()
export class LoaderService<
  T extends LoadersEntityClass = LoadersEntityClass,
  K extends LoaderTypeEntityClass = LoaderTypeEntityClass,
> {
  readonly loaderRepository: Repository<T>;
  readonly loaderTypeRepository: Repository<K>;
  readonly loaderUnitRepository: Repository<LoaderUnitEntityClass>;
  readonly loaderSerialMaxDigits = 4;
  constructor(
    private readonly dataSource: DataSource,
    private readonly sequenceService: WmsSequenceService,
    private readonly entities: WmsEntities,
    @Inject(LoadersEntity) readonly loaderEntity: EntityTarget<T>,
    @Inject(LoaderTypeEntity) readonly loaderTypeEntity: EntityTarget<K>,
    @Inject(LoaderUnitEntity)
    readonly loaderUnitEntity: EntityTarget<LoaderUnitEntityClass>,
  ) {
    this.loaderRepository = this.dataSource.getRepository<T>(this.loaderEntity);
    this.loaderTypeRepository = this.dataSource.getRepository<K>(
      this.loaderTypeEntity,
    );
    this.loaderUnitRepository =
      this.dataSource.getRepository<LoaderUnitEntityClass>(
        this.loaderUnitEntity,
      );
  }

  async createLoader({
    manager: outerManager,
    ...options
  }: CreateLoaderInput & { manager?: EntityManager }): Promise<T[]> {
    return runInTransaction(this.dataSource, outerManager, async (manager) => {
      const loaderRepository = manager.getRepository<LoadersEntityClass>(
        this.loaderEntity,
      );
      const loaderTypeRepository = manager.getRepository<LoaderTypeEntityClass>(
        this.loaderTypeEntity,
      );

      const { key } = await loaderTypeRepository.findOneByOrFail({
        id: options.typeId,
      });

      const startSeq = await this.getSeq(key, options.quantity, manager);

      const loaders: LoadersEntityClass[] = [];
      for (let i = 0; i < options.quantity; i++) {
        const seqNum = startSeq + i;
        const paddedSeq = seqNum
          .toString()
          .padStart(this.loaderSerialMaxDigits, '0');
        const loader = loaderRepository.create({
          ...options,
          serialId: `${key}${paddedSeq}`,
        });
        loaders.push(loader);
      }

      return loaderRepository.save(loaders, { chunk: 1000 }) as Promise<T[]>;
    });
  }

  async createBatchLoaders({
    options,
    manager: outerManager,
  }: {
    options: CreateLoaderInput[];
    manager?: EntityManager;
  }): Promise<T[]> {
    return runInTransaction(this.dataSource, outerManager, async (manager) => {
      if (options.length === 0) return [];

      const loaderRepository = manager.getRepository<LoadersEntityClass>(
        this.loaderEntity,
      );
      const loaderTypeRepository = manager.getRepository<LoaderTypeEntityClass>(
        this.loaderTypeEntity,
      );

      const typeMap = await loaderTypeRepository
        .findBy({ id: In(options.map(({ typeId }) => typeId)) })
        .then((types) => new Map(types.map((t) => [t.id, t])));

      // One loader type after another, so each type's serials come out in the
      // order the caller listed them.
      const loaders: LoadersEntityClass[] = [];
      for (const option of options) {
        const loaderType = typeMap.get(option.typeId);
        if (!loaderType) continue;

        const { key } = loaderType;
        const startSeq = await this.getSeq(key, option.quantity, manager);

        loaders.push(
          ...Array.from({ length: option.quantity }, (_, index) =>
            loaderRepository.create({
              ...option,
              serialId: `${key}${(startSeq + index)
                .toString()
                .padStart(this.loaderSerialMaxDigits, '0')}`,
            }),
          ),
        );
      }

      return loaderRepository.save(loaders, { chunk: 1000 }) as Promise<T[]>;
    });
  }

  async updateLoader({
    id,
    manager = this.dataSource.manager,
    ...options
  }: UpdateLoaderInput & { manager?: EntityManager }): Promise<T> {
    const loadersRepository = manager.getRepository<LoadersEntityClass>(
      this.loaderEntity,
    );
    const loader = await loadersRepository.findOneByOrFail({ id });
    return loadersRepository.save(
      loadersRepository.create({
        ...loader,
        ...options,
      }),
    ) as Promise<T>;
  }

  createLoaderType({
    manager = this.dataSource.manager,
    ...options
  }: CreateLoaderTypeInput & { manager?: EntityManager }): Promise<K> {
    const loaderTypeRepository = manager.getRepository<LoaderTypeEntityClass>(
      this.loaderTypeEntity,
    );
    const loaderType = loaderTypeRepository.create(options);
    return loaderTypeRepository.save(loaderType) as Promise<K>;
  }

  async updateLoaderType({
    id,
    manager = this.dataSource.manager,
    ...options
  }: UpdateLoaderTypeInput & { manager?: EntityManager }): Promise<K> {
    const loaderTypeRepository = manager.getRepository<LoaderTypeEntityClass>(
      this.loaderTypeEntity,
    );
    const loaderType = await loaderTypeRepository.findOneByOrFail({ id });
    return loaderTypeRepository.save(
      loaderTypeRepository.create({
        ...loaderType,
        ...options,
      }),
    ) as Promise<K>;
  }

  /**
   * Reserve `count` consecutive loader serial numbers for loader type `prefix`
   * and return the first. Counted by `WmsSequenceService` under `<prefix>_SEQ`.
   */
  async getSeq(
    prefix: string,
    count: number,
    manager?: EntityManager,
    maxDigits = this.loaderSerialMaxDigits,
  ): Promise<number> {
    const maxValue = 10 ** maxDigits - 1;

    return runInTransaction(
      this.dataSource,
      manager,
      async (transactionManager) => {
        // The bound is checked before the counter moves, so an oversized
        // request leaves the serials where they were in both storage modes.
        return this.sequenceService.reserve(
          `${prefix}_SEQ`,
          count,
          transactionManager,
          { consecutive: true, maxValue },
        );
      },
    );
  }

  findManyLoaders(options: FindLoaderInput<T>): Promise<[T[], number]> {
    const queryBuilder = this.dataSource
      .getRepository<T>(this.loaderEntity)
      .createQueryBuilder('loader');

    if (options.typeId)
      queryBuilder.andWhere('loader."typeId" = :typeId', {
        typeId: options.typeId,
      });

    if (options.typeIds?.length)
      queryBuilder.andWhere('loader."typeId" IN (:...typeIds)', {
        typeIds: options.typeIds,
      });

    if (options.locationId)
      queryBuilder.andWhere('loader."locationId" = :locationId', {
        locationId: options.locationId,
      });

    if (options.locationIds?.length)
      queryBuilder.andWhere('loader."locationId" IN (:...locationIds)', {
        locationIds: options.locationIds,
      });

    if (options.serialId)
      queryBuilder.andWhere('loader."serialId" = :serialId', {
        serialId: options.serialId,
      });

    if (options.serialIds?.length)
      queryBuilder.andWhere('loader."serialId" IN (:...serialIds)', {
        serialIds: options.serialIds,
      });

    if (options.isActive !== undefined)
      queryBuilder.andWhere('loader."isActive" = :isActive', {
        isActive: options.isActive,
      });

    if (options.dateRange)
      queryBuilder.andWhere('loader."createdAt" BETWEEN :from AND :to', {
        from: options.dateRange.from,
        to: options.dateRange.to,
      });

    if (options.note)
      queryBuilder.andWhere('loader.note LIKE :note', {
        note: `%${options.note}%`,
      });

    if (options.locationKey)
      queryBuilder.andWhere(
        `EXISTS (
          SELECT 1 FROM ${quotedTablePathOf(this.dataSource, this.entities.location)} ldr_loc
          WHERE ldr_loc.id = loader."locationId"
          AND ldr_loc.key ILIKE :locationKey
        )`,
        { locationKey: `%${options.locationKey}%` },
      );

    if (options.loaderTypeKey)
      queryBuilder.andWhere(
        `EXISTS (
          SELECT 1 FROM ${quotedTablePathOf(this.dataSource, this.loaderTypeEntity)} ldr_type
          WHERE ldr_type.id = loader."typeId"
          AND ldr_type.key ILIKE :loaderTypeKey
        )`,
        { loaderTypeKey: `%${options.loaderTypeKey}%` },
      );

    if (options.wildcard) {
      const { key, value } = options.wildcard;
      queryBuilder.andWhere(`loader."${String(key)}" ILIKE :value`, {
        value: `%${value}%`,
      });
    }

    if (options.offset !== undefined && options.offset >= 0)
      queryBuilder.skip(options.offset);

    if (options.limit !== undefined && options.limit > 0)
      queryBuilder.take(options.limit);

    return queryBuilder.getManyAndCount();
  }

  findManyLoaderTypes(options: FindLoaderTypeInput<K>): Promise<[K[], number]> {
    const queryBuilder = this.dataSource
      .getRepository<K>(this.loaderTypeEntity)
      .createQueryBuilder('loader_type');

    if (options.description)
      queryBuilder.andWhere('loader_type.description ILIKE :description', {
        description: `%${options.description}%`,
      });

    if (options.isActive !== undefined)
      queryBuilder.andWhere('loader_type."isActive" = :isActive', {
        isActive: options.isActive,
      });

    if (options.dateRange)
      queryBuilder.andWhere('loader_type."createdAt" BETWEEN :from AND :to', {
        from: options.dateRange.from,
        to: options.dateRange.to,
      });

    if (options.wildcard) {
      const { key, value } = options.wildcard;
      queryBuilder.andWhere(`loader_type."${String(key)}" ILIKE :value`, {
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
