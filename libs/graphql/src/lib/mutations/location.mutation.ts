import { Injectable } from '@nestjs/common';
import { Args, Mutation } from '@nestjs/graphql';
import { LocationService } from '@rytass/wms-module-core';
import { LocationDto } from '../dto/location.dto';
import {
  CreateLocationArgs,
  UpdateLocationArgs,
} from '../inputs/create-location.args';
import { WmsOperation } from '../auth';

@Injectable()
export class LocationMutation {
  constructor(private readonly locationService: LocationService) {}

  @Mutation(() => LocationDto)
  @WmsOperation({ resource: 'location', action: 'create' })
  async createLocation(@Args() args: CreateLocationArgs) {
    return this.locationService.createLocation(args);
  }

  @Mutation(() => LocationDto)
  @WmsOperation({ resource: 'location', action: 'update' })
  async updateLocation(@Args() args: UpdateLocationArgs) {
    return this.locationService.updateLocation(args);
  }
}
