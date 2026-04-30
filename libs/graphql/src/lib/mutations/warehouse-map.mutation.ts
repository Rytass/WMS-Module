import { Injectable } from '@nestjs/common';
import { WarehouseMapService as WarehouseMapBaseService } from '@rytass/wms-base-nestjs-module';
import { MapDataDto } from '../dto/warehouse-map.dto';
import { Args, Mutation } from '@nestjs/graphql';
import { UpdateWarehouseMapArgs } from '../inputs/update-warehouse-map.args';
import { WarehouseMapDataService } from '@wms-module/core';
import { In } from 'typeorm';

@Injectable()
export class WarehouseMapMutation {
  constructor(
    private readonly warehouseMapBaseService: WarehouseMapBaseService,
    private readonly warehouseMapService: WarehouseMapDataService,
  ) {}

  @Mutation(() => MapDataDto)
  async updateWarehouseMap(
    @Args() args: UpdateWarehouseMapArgs,
  ): Promise<MapDataDto> {
    const { mapData } = await this.warehouseMapBaseService.updateMap(
      args.locationKey,
      args.backgrounds,
      args.ranges,
    );
    if (mapData.ranges) {
      const rangeIds = mapData.ranges.map(({ id }) => id);
      const existedIds =
        await this.warehouseMapService.warehouseMapDataRepository
          .findBy({
            id: In(rangeIds),
          })
          .then((entities) => entities.map(({ id }) => id));
      const notExistedIds = rangeIds.filter((id) => !existedIds.includes(id));
      if (notExistedIds.length) {
        await this.warehouseMapService.warehouseMapDataRepository.save(
          notExistedIds.map((id) =>
            this.warehouseMapService.warehouseMapDataRepository.create({
              id,
              mapData: {
                id,
                backgrounds: [],
                ranges: [],
              },
            }),
          ),
        );
      }
    }
    return mapData;
  }
}
