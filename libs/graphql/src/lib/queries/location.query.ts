import { Injectable } from '@nestjs/common';
import { Args, ID, Query } from '@nestjs/graphql';
import { LocationEntityClass, LocationService } from '@wms-module/core';
import { LocationDto, Locations } from '../dto/location.dto';
import { FindLocationArgs } from '../inputs/find-location.args';

@Injectable()
export class LocationQuery {
  constructor(private readonly locationService: LocationService) {}

  @Query(() => LocationDto)
  location(@Args('id', { type: () => ID }) id: string): Promise<LocationDto> {
    return this.locationService.locationReposistory
      .createQueryBuilder('location')
      .leftJoinAndSelect('location.children', 'children')
      .where('location.id = :id', { id })
      .getOneOrFail() as Promise<LocationDto>;
  }

  @Query(() => Locations)
  async locations(@Args() args: FindLocationArgs): Promise<Locations> {
    const [items, total] = await this.locationService.findMany({
      ...args,
      wildcard: args.key ? { key: 'key', value: args.key } : undefined,
    });
    return { items, total };
  }

  @Query(() => LocationDto)
  async rootLocation(): Promise<LocationEntityClass> {
    const root = await this.locationService.locationReposistory.findOneByOrFail(
      {
        key: this.locationService.defaultRootLocationKey,
      },
    );

    return {
      ...root,
      children: await this.locationService.locationReposistory
        .createQueryBuilder('location')
        .where('location."parentId" IS NULL')
        .getMany(),
    };
  }
}
