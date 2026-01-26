import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  LoaderTypeEntity,
  LoaderTypeEntityClass,
} from './metadata/loader-type.entity';
import { LoadersEntity, LoadersEntityClass } from './metadata/loader.entity';
import {
  MaterialUnitEntity,
  MaterialUnitEntityClass,
} from './metadata/material-unit.entity';
import {
  MaterialEntity,
  MaterialEntityClass,
} from './metadata/material.entity';
import { StockEntity, StockEntityClass } from './metadata/stock.entity';
import {
  LocationEntity,
  LocationEntityClass,
} from './metadata/location.entity';
import {
  ReceiveInventoryOrderChangeEntity,
  ReceiveInventoryOrderChangeEntityClass,
  ReceiveInventoryOrderEntity,
  ReceiveInventoryOrderEntityClass,
  ReceiveInventoryOrderItemEntity,
  ReceiveInventoryOrderItemEntityClass,
  ShipInventoryOrderEntity,
  ShipInventoryOrderEntityClass,
  ShipInventoryOrderItemEntity,
  ShipInventoryOrderItemEntityClass,
  ShipInventoryOrderChangeEntity,
  ShipInventoryOrderChangeEntityClass,
} from './extensions';
import { UnitEntity, UnitEntityClass } from './metadata';

const entities = [
  [UnitEntity, UnitEntityClass],
  [MaterialEntity, MaterialEntityClass],
  [MaterialUnitEntity, MaterialUnitEntityClass],
  [LoadersEntity, LoadersEntityClass],
  [LoaderTypeEntity, LoaderTypeEntityClass],
  [StockEntity, StockEntityClass],
  [LocationEntity, LocationEntityClass],
  [ReceiveInventoryOrderEntity, ReceiveInventoryOrderEntityClass],
  [ReceiveInventoryOrderItemEntity, ReceiveInventoryOrderItemEntityClass],
  [ReceiveInventoryOrderChangeEntity, ReceiveInventoryOrderChangeEntityClass],
  [ShipInventoryOrderEntity, ShipInventoryOrderEntityClass],
  [ShipInventoryOrderItemEntity, ShipInventoryOrderItemEntityClass],
  [ShipInventoryOrderChangeEntity, ShipInventoryOrderChangeEntityClass],
] as [symbol, new () => object][];

export const ResolvedEntitiesProviders = entities.map(([token, entity]) => ({
  provide: token,
  useValue: entity,
}));

@Module({
  imports: [TypeOrmModule.forFeature(entities.map(([_, entity]) => entity))],
  providers: ResolvedEntitiesProviders,
  exports: [TypeOrmModule, ...ResolvedEntitiesProviders],
})
export class ModelsModule {}
