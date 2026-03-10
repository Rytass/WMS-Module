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
  readonly loaderSerialMaxDigits = 4;
  constructor(
    private readonly dataSource: DataSource,
    @Inject(LoadersEntity) readonly loaderEntity: EntityTarget<T>,
    @Inject(LoaderTypeEntity) readonly loaderTypeEntity: EntityTarget<K>,
  ) {
    this.loaderRepository = this.dataSource.getRepository<T>(this.loaderEntity);
    this.loaderTypeRepository = this.dataSource.getRepository<K>(
      this.loaderTypeEntity,
    );
  }

  async createLoader({
    manager = this.dataSource.manager,
    ...options
  }: CreateLoaderInput & { manager?: EntityManager }): Promise<T[]> {
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
  }

  async createBatchLoaders({
    options,
    manager = this.dataSource.manager,
  }: {
    options: CreateLoaderInput[];
    manager?: EntityManager;
  }): Promise<T[]> {
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

    const loaders: LoadersEntityClass[] = [];
    await Promise.all(
      options.map(async (option) => {
        const loaderType = typeMap.get(option.typeId);
        if (loaderType) {
          const { key } = loaderType;
          const startSeq = await this.getSeq(key, option.quantity, manager);
          for (let i = 0; i < option.quantity; i++) {
            console.log({ startSeq });
            const seqNum = startSeq + i;
            const paddedSeq = seqNum
              .toString()
              .padStart(this.loaderSerialMaxDigits, '0');
            const loader = loaderRepository.create({
              ...option,
              serialId: `${key}${paddedSeq}`,
            });
            loaders.push(loader);
          }
        } else return;
      }),
    );

    return loaderRepository.save(loaders, { chunk: 1000 }) as Promise<T[]>;
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

  async getSeq(
    prefix: string,
    count: number,
    manager = this.dataSource.manager,
    maxDigits = this.loaderSerialMaxDigits,
  ): Promise<number> {
    const seqName = `${prefix}_SEQ`;
    const maxValue = 10 ** maxDigits - 1;

    let startVal: number;

    try {
      const [{ val }] = await manager.query<[{ val: string }]>(
        `SELECT CURRVAL('"${seqName}"') + 1 AS val`,
      );
      startVal = parseInt(val, 10);
    } catch (ex) {
      const msg = (ex as Error).message;

      if (/does\snot\sexist/.test(msg)) {
        await manager.query(`CREATE SEQUENCE "${seqName}"`);
      } else if (!/not\syet\sdefined/.test(msg)) {
        throw ex;
      }

      // Initialize with NEXTVAL
      const [{ nextval }] = await manager.query<[{ nextval: string }]>(
        `SELECT NEXTVAL('"${seqName}"') AS nextval`,
      );
      startVal = parseInt(nextval, 10);
    }

    const endVal = startVal + count - 1;
    if (endVal > maxValue) {
      throw new Error(
        `SEQUENCE_OUT_OF_RANGE: ${prefix} exceeds ${maxDigits} digits (max: ${maxValue}, end: ${endVal})`,
      );
    }

    await manager.query(`SELECT SETVAL('"${seqName}"', $1)`, [endVal]);
    return startVal;
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
