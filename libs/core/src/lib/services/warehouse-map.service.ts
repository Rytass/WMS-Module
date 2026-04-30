import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { WarehouseMapEntity } from '@rytass/wms-base-nestjs-module/models/warehouse-map.entity';

@Injectable()
export class WarehouseMapDataService implements OnApplicationBootstrap {
  readonly defaultMapDataKey = 'DEFAULT_MAP_DATA_KEY';
  readonly warehouseMapDataRepository: Repository<WarehouseMapEntity>;
  constructor(private readonly dataSource: DataSource) {
    this.warehouseMapDataRepository =
      this.dataSource.getRepository(WarehouseMapEntity);
  }
  onApplicationBootstrap() {
    this.dataSource.transaction(async (manager) => {
      const defaultMapData = await manager
        .getRepository(WarehouseMapEntity)
        .findOneBy({ id: this.defaultMapDataKey });
      if (!defaultMapData) {
        await manager.getRepository(WarehouseMapEntity).save(
          manager.getRepository(WarehouseMapEntity).create({
            id: this.defaultMapDataKey,
            mapData: {
              id: this.defaultMapDataKey,
              backgrounds: [],
              ranges: [],
            },
          }),
        );
      }
    });
  }
}
