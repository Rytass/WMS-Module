import { Inject, Injectable } from '@nestjs/common';
import { LocationService as BaseLocationService } from '@rytass/wms-base-nestjs-module';
import { DataSource, DeepPartial, EntityTarget, Repository } from 'typeorm';
import { LocationEntity, LocationEntityClass } from '../models';
import {
  CreateLocationInput,
  UpdateLocationInput,
} from '../typings/create-location.input';
import { FindLocationInput } from '../typings/find-location.input';

@Injectable()
export class LocationService<
  T extends LocationEntityClass = LocationEntityClass,
> {
  readonly locationReposistory: Repository<T>;
  constructor(
    private readonly dataSource: DataSource,
    private readonly locationBaseService: BaseLocationService,
    @Inject(LocationEntity) readonly locationEntity: EntityTarget<T>,
  ) {
    this.locationReposistory = this.dataSource.getRepository<T>(
      this.locationEntity,
    );
  }

  async createLocation({
    parentId,
    ...options
  }: CreateLocationInput): Promise<T> {
    const parent = parentId
      ? await this.locationReposistory
          .createQueryBuilder('l')
          .where('l.id = :id', { id: parentId })
          .getOneOrFail()
      : undefined;

    return this.locationReposistory.save(
      this.locationReposistory.create({
        ...options,
        ...(parent !== undefined && { parent }),
      } as unknown as DeepPartial<T>),
    );
  }

  async updateLocation({
    id,
    parentId,
    ...options
  }: UpdateLocationInput): Promise<T> {
    const location = await this.locationReposistory
      .createQueryBuilder('location')
      .where('location.id = :id', { id })
      .getOneOrFail();

    if (parentId) {
      const parent = await this.locationReposistory
        .createQueryBuilder('l')
        .where('l.id = :id', { id: parentId })
        .getOneOrFail();
      Object.assign(location, { parent });
    } else {
      Object.assign(location, { parent: null });
    }

    return this.locationReposistory.save(
      this.locationReposistory.create({
        ...location,
        ...options,
      }),
    );
  }

  async findMany(options: FindLocationInput<T>): Promise<[T[], number]> {
    const queryBuilder = this.locationReposistory
      .createQueryBuilder('location')
      .loadRelationIdAndMap('location.parentId', 'location.parent');

    if (options.description)
      queryBuilder.andWhere('location."description" ILIKE :description', {
        description: `%${options.description}%`,
      });

    if (options.isActive !== undefined)
      queryBuilder.andWhere('location."isActive" = :isActive', {
        isActive: options.isActive,
      });

    if (options.wildcard) {
      const { key, value } = options.wildcard;
      queryBuilder.andWhere(`location."${String(key)}" ILIKE :value`, {
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
