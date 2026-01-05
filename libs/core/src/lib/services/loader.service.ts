import { Inject, Injectable } from '@nestjs/common';
import { In, Repository } from 'typeorm';
import { LoadersEntity } from '../models/metadata/loader.entity';
import { LoaderTypeEntity } from '../models/metadata/loader-type.entity';
import { DataSource } from 'typeorm/browser';
import {
  CreateLoaderInput,
  UpdateLoaderInput,
} from '../typings/create-loader.input';
import {
  CreateLoaderTypeInput,
  UpdateLoaderTypeInput,
} from '../typings/create-loader-type.input';
import { FindLoaderInput } from '../typings/find-loader.input';

@Injectable()
export class LoaderService {
  readonly loaderRepository!: Repository<LoadersEntity>;
  readonly loaderTypeRepository!: Repository<LoaderTypeEntity>;
  constructor(
    private readonly dataSource: DataSource,
    @Inject('LOADER_SERIAL_MAX_DIGITS')
    private readonly loaderSerialMaxDigits = 4
  ) {
    this.loaderRepository = this.dataSource.getRepository(LoadersEntity);
    this.loaderTypeRepository = this.dataSource.getRepository(LoaderTypeEntity);
  }

  createLoader(options: CreateLoaderInput): Promise<LoadersEntity[]> {
    return this.dataSource.transaction(async (manager) => {
      const loaderRepository = manager.getRepository(LoadersEntity);
      const loaderTypeRepository = manager.getRepository(LoaderTypeEntity);

      const { serial } = await loaderTypeRepository.findOneByOrFail({
        id: options.typeId,
      });

      const startSeq = await this.getSeq(serial, options.quantity, manager);

      const loaders: LoadersEntity[] = [];
      for (let i = 0; i < options.quantity; i++) {
        const seqNum = startSeq + i;
        const paddedSeq = seqNum
          .toString()
          .padStart(this.loaderSerialMaxDigits, '0');
        const loader = loaderRepository.create({
          ...options,
          serialId: `${serial}${paddedSeq}`,
        });
        loaders.push(loader);
      }

      return loaderRepository.save(loaders, { chunk: 1000 });
    });
  }

  createBatchLoaders(options: CreateLoaderInput[]): Promise<LoadersEntity[]> {
    return this.dataSource.transaction(async (manager) => {
      if (options.length === 0) return [];

      const loaderRepository = manager.getRepository(LoadersEntity);
      const loaderTypeRepository = manager.getRepository(LoaderTypeEntity);

      const types = await loaderTypeRepository.findBy({
        id: In(options.map(({ typeId }) => typeId)),
      });
      const typeMap = new Map<string, LoaderTypeEntity>(
        types.map((t) => [t.id, t])
      );

      const loaders: LoadersEntity[] = [];
      Promise.all(
        options.map(async (option) => {
          const { serial } = typeMap.get(option.typeId)!;

          const startSeq = await this.getSeq(serial, option.quantity, manager);
          for (let i = 0; i < option.quantity; i++) {
            const seqNum = startSeq + i;
            const paddedSeq = seqNum
              .toString()
              .padStart(this.loaderSerialMaxDigits, '0');
            const loader = loaderRepository.create({
              ...option,
              serialId: `${serial}${paddedSeq}`,
            });
            loaders.push(loader);
          }
        })
      );

      return loaderRepository.save(loaders, { chunk: 1000 });
    });
  }

  async updateLoader({
    id,
    ...options
  }: UpdateLoaderInput): Promise<LoadersEntity> {
    const loader = await this.loaderRepository.findOneByOrFail({ id });
    return this.loaderRepository.save(
      this.loaderRepository.create({
        ...loader,
        ...options,
      })
    );
  }

  createLoaderType(options: CreateLoaderTypeInput): Promise<LoaderTypeEntity> {
    const loaderType = this.loaderTypeRepository.create(options);
    return this.loaderTypeRepository.save(loaderType);
  }

  async updateLoaderType({
    id,
    ...options
  }: UpdateLoaderTypeInput): Promise<LoaderTypeEntity> {
    const loaderType = await this.loaderTypeRepository.findOneByOrFail({ id });
    return this.loaderTypeRepository.save(
      this.loaderTypeRepository.create({
        ...loaderType,
        ...options,
      })
    );
  }

  async getSeq(
    prefix: string,
    count: number,
    manager = this.dataSource.manager,
    maxDigits = this.loaderSerialMaxDigits
  ): Promise<number> {
    const seqName = `${prefix}_SEQ`;
    const maxValue = 10 ** maxDigits - 1;

    let startVal: number;

    try {
      const [{ val }] = await manager.query<[{ val: number }]>(
        `SELECT CURRVAL('${seqName}') + 1 AS val`
      );
      startVal = val;
    } catch (ex) {
      const msg = (ex as Error).message;

      if (/does\snot\sexist/.test(msg)) {
        await manager.query(`CREATE SEQUENCE ${seqName}`);
      } else if (!/not\syet\sdefined/.test(msg)) {
        throw ex;
      }

      // Initialize with NEXTVAL
      const [{ nextval }] = await manager.query<[{ nextval: number }]>(
        `SELECT NEXTVAL('${seqName}') AS nextval`
      );
      startVal = nextval;
    }

    const endVal = startVal + count - 1;
    if (endVal > maxValue) {
      throw new Error(
        `SEQUENCE_OUT_OF_RANGE: ${prefix} exceeds ${maxDigits} digits (max: ${maxValue}, end: ${endVal})`
      );
    }

    await manager.query(`SELECT SETVAL('${seqName}', $1)`, [endVal]);
    return startVal;
  }

  findMany(options: FindLoaderInput): Promise<[LoadersEntity[], number]> {
    const queryBuilder = this.loaderRepository.createQueryBuilder('loader');

    if (options.typeId)
      queryBuilder.andWhere('loader.typeId = :typeId', {
        typeId: options.typeId,
      });

    if (options.typeIds?.length)
      queryBuilder.andWhere('loader.typeId IN (:...typeIds)', {
        typeIds: options.typeIds,
      });

    if (options.locationId)
      queryBuilder.andWhere('loader.locationId = :locationId', {
        locationId: options.locationId,
      });

    if (options.locationIds?.length)
      queryBuilder.andWhere('loader.locationId IN (:...locationIds)', {
        locationIds: options.locationIds,
      });

    if (options.serialId)
      queryBuilder.andWhere('loader.serialId = :serialId', {
        serialId: options.serialId,
      });

    if (options.serialIds?.length)
      queryBuilder.andWhere('loader.serialId IN (:...serialIds)', {
        serialIds: options.serialIds,
      });

    if (options.isActive !== undefined)
      queryBuilder.andWhere('loader.isActive = :isActive', {
        isActive: options.isActive,
      });

    if (options.dateRange)
      queryBuilder.andWhere('loader.createdAt BETWEEN :from AND :to', {
        from: options.dateRange.from,
        to: options.dateRange.to,
      });

    if (options.note)
      queryBuilder.andWhere('loader.note LIKE :note', {
        note: `%${options.note}%`,
      });

    if (
      options.offset !== undefined &&
      options.offset >= 0 &&
      options.limit !== undefined &&
      options.limit > 0
    )
      queryBuilder.skip(options.offset).take(options.limit);

    return queryBuilder.getManyAndCount();
  }
}
