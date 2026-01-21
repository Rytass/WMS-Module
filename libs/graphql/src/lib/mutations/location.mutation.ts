import { Injectable } from '@nestjs/common';
import { Mutation } from '@nestjs/graphql';
import { LocationService } from '@wms-module/core';
import { LocationDto } from '../dto/location.dto';

@Injectable()
export class LocationMutation {
  constructor(private readonly locationService: LocationService) {}

  @Mutation(() => LocationDto)
  async createLocation() {}
}
