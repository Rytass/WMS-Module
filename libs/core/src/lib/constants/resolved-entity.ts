import {
  LoaderTypeEntity,
  LoaderTypeEntityClass,
} from '../models/metadata/loader-type.entity';
import {
  LoadersEntity,
  LoadersEntityClass,
} from '../models/metadata/loader.entity';
import {
  MaterialUnitEntity,
  MaterialUnitEntityClass,
} from '../models/metadata/material-unit.entity';
import {
  MaterialEntity,
  MaterialEntityClass,
} from '../models/metadata/material.entity';
import { StockEntity, StockEntityClass } from '../models/metadata/stock.entity';

const entities = [
  [MaterialEntity, MaterialEntityClass],
  [MaterialUnitEntity, MaterialUnitEntityClass],
  [LoadersEntity, LoadersEntityClass],
  [LoaderTypeEntity, LoaderTypeEntityClass],
  [StockEntity, StockEntityClass],
];

export const ResolvedEntitiesProviders = entities.map(([token, entity]) => ({
  provide: token,
  useValue: entity,
}));
