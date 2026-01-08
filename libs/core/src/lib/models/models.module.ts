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

const entities = [
  [MaterialEntity, MaterialEntityClass],
  [MaterialUnitEntity, MaterialUnitEntityClass],
  [LoadersEntity, LoadersEntityClass],
  [LoaderTypeEntity, LoaderTypeEntityClass],
  [StockEntity, StockEntityClass],
] as [symbol, new () => object][];

export const ResolvedEntitiesProviders = entities.map(([token, entity]) => ({
  provide: token,
  useValue: entity,
}));

@Module({
  imports: [TypeOrmModule.forFeature(entities.map(([_, entity]) => entity))],
  providers: ResolvedEntitiesProviders,
})
export class ModelsModule {}
