import { Injectable } from '@nestjs/common';
import { Args, Mutation } from '@nestjs/graphql';
import { LocationService } from '@wms-module/core';
import { LocationDto } from '../dto/location.dto';
import {
  CreateLocationArgs,
  UpdateLocationArgs,
} from '../inputs/create-location.args';

@Injectable()
export class LocationMutation {
  constructor(private readonly locationService: LocationService) {}

  @Mutation(() => LocationDto)
  async createLocation(@Args() args: CreateLocationArgs) {
    return this.locationService.createLocation(args);
  }

  @Mutation(() => LocationDto)
  async updateLocation(@Args() args: UpdateLocationArgs) {
    return this.locationService.updateLocation(args);
  }
}
