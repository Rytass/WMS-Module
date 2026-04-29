import { Injectable } from '@nestjs/common';
import { WarehouseMapService } from '@rytass/wms-base-nestjs-module';
import { MapDataDto } from '../dto/warehouse-map.dto';
import { Args, Mutation } from '@nestjs/graphql';
import { UpdateWarehouseMapArgs } from '../inputs/update-warehouse-map.args';
import { LocationService } from '@wms-module/core';

@Injectable()
export class WarehouseMapMutation {
  constructor(
    private readonly warehouseMapService: WarehouseMapService,
    private readonly locationService: LocationService,
  ) {}

  @Mutation(() => MapDataDto)
  async updateWarehouseMap(
    @Args() args: UpdateWarehouseMapArgs,
  ): Promise<MapDataDto> {
    const { mapData } = await this.warehouseMapService.updateMap(
      await this.locationService.locationReposistory
        .findOneByOrFail({ key: args.locationKey })
        .then(({ id }) => id),
      args.backgrounds,
      args.ranges,
    );
    return mapData;
  }
}
