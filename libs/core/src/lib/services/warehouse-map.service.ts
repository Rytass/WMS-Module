import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { WarehouseMapEntity } from '@rytass/wms-base-nestjs-module/models/warehouse-map.entity';
import { WmsEntities } from '../models/wms-entities';

/**
 * Where a location is drawn, and the chain of maps that leads to it.
 *
 * `path` runs from the root map down to `mapKey` (inclusive), using raw map ids.
 * In a normal deployment the first element is the seeded root map's id,
 * `DEFAULT_MAP_DATA_KEY`; a UI that labels it differently (react shows `ROOT`)
 * translates on display.
 */
export interface LocationMapPreview {
  readonly locationKey: string;
  readonly mapKey: string;
  readonly path: readonly string[];
  readonly mapData: WarehouseMapEntity['mapData'];
}

/** Ancestor walk limit; a deeper chain than this is treated as corrupt data. */
export const LOCATION_MAP_PREVIEW_MAX_DEPTH = 32;

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
   * The map that draws `locationKey`, plus the breadcrumb from the root to it.
   *
   * The map hierarchy is kept apart from `locations.parentId`: a map's id is the
   * key of the location it drills into, and `mapData.ranges[].id` names the
   * child locations drawn on it. So "where is X drawn" is "which map has a range
   * whose id is X", and a map's parent is the map that draws the map's own id.
   *
   * Returns `null` when no map draws the location.
   *
   * When a key is drawn on several maps (the editor does not forbid it), the map
   * with the lowest id wins — byte order (`COLLATE "C"`), so every deployment
   * agrees regardless of its database locale, rather than whatever the planner
   * returns first. The same rule picks a parent at every step of the walk.
   *
   * The walk stops at a map nobody draws, at an id it has already visited
   * (a cycle in hand-edited map data), or after
   * `LOCATION_MAP_PREVIEW_MAX_DEPTH` maps.
   */
  async findLocationMapPreview(
    locationKey: string,
    manager?: EntityManager,
  ): Promise<LocationMapPreview | null> {
    const repository = (manager ?? this.dataSource.manager).getRepository(
      this.entities.warehouseMap,
    );

    const holder = await this.findMapDrawing(repository, locationKey);

    if (!holder) return null;

    // `ancestors` doubles as the visited set: the walk only ever prepends.
    const walk = async (
      ancestors: readonly string[],
      currentId: string,
    ): Promise<readonly string[]> => {
      if (ancestors.length >= LOCATION_MAP_PREVIEW_MAX_DEPTH) return ancestors;

      const parent = await this.findMapDrawing(repository, currentId);

      if (!parent || ancestors.includes(parent.id)) return ancestors;

      return walk([parent.id, ...ancestors], parent.id);
    };

    const path = await walk([holder.id], holder.id);

    return {
      locationKey,
      mapKey: holder.id,
      path,
      mapData: holder.mapData,
    };
  }

  /** The lowest-id map whose ranges include one with `id = rangeId`. */
  private async findMapDrawing(
    repository: Repository<WarehouseMapEntity>,
    rangeId: string,
  ): Promise<WarehouseMapEntity | null> {
    const alias = 'map';
    const { metadata } = repository;
    const escape = (name: string): string =>
      repository.manager.connection.driver.escape(name);
    const mapDataColumn =
      metadata.findColumnWithPropertyName('mapData')?.databaseName;
    const idColumn = metadata.findColumnWithPropertyName('id')?.databaseName;

    if (!mapDataColumn || !idColumn) {
      throw new Error(
        `${metadata.name} has no mapData/id column; cannot resolve map previews`,
      );
    }

    return repository
      .createQueryBuilder(alias)
      .where(
        `${escape(alias)}.${escape(mapDataColumn)} @> CAST(:needle AS jsonb)`,
        { needle: JSON.stringify({ ranges: [{ id: rangeId }] }) },
      )
      .orderBy(`${escape(alias)}.${escape(idColumn)} COLLATE "C"`, 'ASC')
      .limit(1)
      .getOne();
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
