import { Inject, Injectable } from '@nestjs/common';
import { LocationService as BaseLocationService } from '@rytass/wms-base-nestjs-module';
import { DataSource, EntityTarget, Repository } from 'typeorm';
import { LocationEntity, LocationEntityClass } from '../models';
import { CreateLocationInput } from '../typings/create-location.input';
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

  async createLocation(options: CreateLocationInput): Promise<T> {
    return this.locationBaseService.create(options) as Promise<T>;
  }

  async findMany(options: FindLocationInput<T>): Promise<[T[], number]> {
    const queryBuilder =
      this.locationReposistory.createQueryBuilder('location');

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
