import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { WarehouseMapEntity } from '@rytass/wms-base-nestjs-module/models/warehouse-map.entity';
import { WmsEntities } from '../models/wms-entities';

@Injectable()
export class WarehouseMapDataService implements OnApplicationBootstrap {
  readonly defaultMapDataKey = 'DEFAULT_MAP_DATA_KEY';
  readonly warehouseMapDataRepository: Repository<WarehouseMapEntity>;
  constructor(
    private readonly dataSource: DataSource,
    private readonly entities: WmsEntities,
  ) {
    this.warehouseMapDataRepository = this.dataSource.getRepository(
      this.entities.warehouseMap,
    );
  }
  /**
   * Seed the default map row.
   *
   * `async` on purpose: Nest awaits a returned promise, so bootstrap does not
   * complete until the seed transaction has committed. Firing it off without
   * awaiting used to leave a transaction in flight after `app.init()` resolved
   * — an app that shut down promptly (a test, a short-lived worker) destroyed
   * the pool underneath it and the rejection surfaced as an unhandled
   * `QueryFailedError: Connection terminated` that killed the process.
   */
  async onApplicationBootstrap(): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const defaultMapData = await manager
        .getRepository(this.entities.warehouseMap)
        .findOneBy({ id: this.defaultMapDataKey });
      if (!defaultMapData) {
        await manager.getRepository(this.entities.warehouseMap).save(
          manager.getRepository(this.entities.warehouseMap).create({
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
