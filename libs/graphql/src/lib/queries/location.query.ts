import { Injectable } from '@nestjs/common';
import { Args, ID, Query } from '@nestjs/graphql';
import { LocationService } from '@rytass/wms-module-core';
import { LocationDto, Locations } from '../dto/location.dto';
import { FindLocationArgs } from '../inputs/find-location.args';
import { WmsOperation } from '../auth';

@Injectable()
export class LocationQuery {
  constructor(private readonly locationService: LocationService) {}

  @Query(() => LocationDto)
  @WmsOperation({ resource: 'location', action: 'read' })
  location(@Args('id', { type: () => ID }) id: string): Promise<LocationDto> {
    return this.locationService.locationReposistory
      .createQueryBuilder('location')
      .leftJoinAndSelect('location.children', 'children')
      .where('location.id = :id', { id })
      .getOneOrFail() as Promise<LocationDto>;
  }

  @Query(() => Locations)
  @WmsOperation({ resource: 'location', action: 'read' })
  async locations(@Args() args: FindLocationArgs): Promise<Locations> {
    const [items, total] = await this.locationService.findMany({
      ...args,
      wildcard: args.key ? { key: 'key', value: args.key } : undefined,
    });
    return { items, total };
  }
}
