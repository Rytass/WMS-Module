import { Injectable } from '@nestjs/common';
import { Args, Query } from '@nestjs/graphql';
import { MapDataDto } from '../dto/warehouse-map.dto';
import { WarehouseMapDataService } from '@wms-module/core';

@Injectable()
export class WarehouseMapDataQuery {
  constructor(
    private readonly warehouseMapDataService: WarehouseMapDataService,
  ) {}
  @Query(() => MapDataDto)
  async mapData(@Args('key') key: string): Promise<MapDataDto> {
    const { mapData } =
      await this.warehouseMapDataService.warehouseMapDataRepository.findOneByOrFail(
        { id: key },
      );
    return mapData;
  }
}
