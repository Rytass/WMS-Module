import { Inject, Injectable, type Type } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { WarehouseMapEntity as WarehouseMapEntityClass } from '@rytass/wms-base-nestjs-module/models/warehouse-map.entity';
import { BatchEntity, BatchEntityClass } from './metadata/batch.entity';
import {
  LocationEntity,
  LocationEntityClass,
  WarehouseMapEntity,
} from './metadata/location.entity';
import { MaterialEntity, MaterialEntityClass } from './metadata/material.entity';
import { OrderEntity, OrderEntityClass } from './metadata/order.entity';
import { StockEntity, StockEntityClass } from './metadata/stock.entity';

/**
 * The entity classes this package actually reads and writes, after applying the
 * consumer's `WMSBaseModuleOptions` entity overrides.
 *
 * Every overridable entity is bound to a `Symbol` that `WmsModuleCoreModule`
 * resolves from the base module's `PROVIDE_*_ENTITY` tokens. Injecting them one
 * by one works, but most services and resolvers need three or four at once, so
 * this collects them behind a single dependency.
 *
 * Only entities the base module lets a consumer replace are here. Entities this
 * package owns outright — batch groups, loaders, units, every order extension —
 * have no override to follow and are referenced by class directly.
 */
@Injectable()
export class WmsEntities {
  constructor(
    dataSource: DataSource,
    @Inject(MaterialEntity) readonly material: Type<MaterialEntityClass>,
    @Inject(BatchEntity) readonly batch: Type<BatchEntityClass>,
    @Inject(LocationEntity) readonly location: Type<LocationEntityClass>,
    @Inject(StockEntity) readonly stock: Type<StockEntityClass>,
    @Inject(OrderEntity) readonly order: Type<OrderEntityClass>,
    @Inject(WarehouseMapEntity)
    readonly warehouseMap: Type<WarehouseMapEntityClass>,
  ) {
    this.assertRegistered(dataSource);
  }

  /**
   * Fail during instantiation if an override was never registered with TypeORM.
   *
   * The module cannot register it: `TypeOrmModule.forFeature()` runs while the
   * module graph is assembled, and an override is only known once the options
   * resolve. Registering the built-in class does bring the override's *columns*
   * into the table (TypeORM copies a single-table child's columns into its
   * parent), which makes the omission easy to miss — everything looks right
   * until the first query fails with a bare `EntityMetadataNotFoundError` from
   * somewhere deep in a resolver.
   *
   * This runs in the constructor rather than `onModuleInit` so it lands before
   * any service's own startup work touches the database.
   */
  private assertRegistered(dataSource: DataSource): void {
    const missing = (
      [
        ['materialEntity', this.material],
        ['batchEntity', this.batch],
        ['locationEntity', this.location],
        ['stockEntity', this.stock],
        ['orderEntity', this.order],
        ['warehouseMapEntity', this.warehouseMap],
      ] as const
    ).filter(([, entity]) => !dataSource.hasMetadata(entity));

    if (!missing.length) return;

    const details = missing
      .map(([option, entity]) => `${option}: ${entity.name}`)
      .join(', ');
    const names = missing.map(([, entity]) => entity.name).join(', ');

    throw new Error(
      `WmsModuleCoreModule: configured entities are not registered with TypeORM (${details}). Add them to your DataSource "entities", or import TypeOrmModule.forFeature([${names}]) somewhere in your app when using autoLoadEntities.`,
    );
  }
}
