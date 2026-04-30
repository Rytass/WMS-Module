import { Injectable } from '@nestjs/common';
import { WarehouseMapService } from '@rytass/wms-base-nestjs-module';
import { MapDataDto } from '../dto/warehouse-map.dto';
import { Args, Mutation } from '@nestjs/graphql';
import { UpdateWarehouseMapArgs } from '../inputs/update-warehouse-map.args';

@Injectable()
export class WarehouseMapMutation {
  constructor(private readonly warehouseMapService: WarehouseMapService) {}

  @Mutation(() => MapDataDto)
  async updateWarehouseMap(
    @Args() args: UpdateWarehouseMapArgs,
  ): Promise<MapDataDto> {
    const { mapData } = await this.warehouseMapService.updateMap(
      args.locationKey,
      args.backgrounds,
      args.ranges,
    );
    return mapData;
  }
}
