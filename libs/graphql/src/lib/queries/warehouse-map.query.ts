import { Injectable } from '@nestjs/common';
import { Args, Query } from '@nestjs/graphql';
import { LocationMapPreviewDto, MapDataDto } from '../dto/warehouse-map.dto';
import { WarehouseMapDataService } from '@rytass/wms-module-core';
import { WmsOperation } from '../auth';

@Injectable()
export class WarehouseMapDataQuery {
  constructor(
    private readonly warehouseMapDataService: WarehouseMapDataService,
  ) {}
  @Query(() => MapDataDto)
  @WmsOperation({ resource: 'warehouse-map', action: 'read' })
  async mapData(@Args('key') key: string): Promise<MapDataDto> {
    const { mapData } =
      await this.warehouseMapDataService.warehouseMapDataRepository.findOneByOrFail(
        { id: key },
      );
    return mapData;
  }

  @Query(() => LocationMapPreviewDto, {
    nullable: true,
    description:
      'The map a location is drawn on and the breadcrumb of maps leading to it; null when no map draws it.',
  })
  @WmsOperation({ resource: 'warehouse-map', action: 'read' })
  async locationMapPreview(
    @Args('key') key: string,
  ): Promise<LocationMapPreviewDto | null> {
    const preview =
      await this.warehouseMapDataService.findLocationMapPreview(key);

    return preview ? { ...preview, path: [...preview.path] } : null;
  }
}
