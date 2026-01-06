import { type EntityTarget, type ObjectLiteral } from 'typeorm';
import { MaterialEntityClass } from './models/metadata/material.entity';
import { MaterialUnitEntityClass } from './models/metadata/material-unit.entity';

/**
 * Configuration options for dynamic entity injection
 * Allows consumers to provide custom entity implementations
 */
export interface CoreModuleOptions {
  /**
   * Custom Material Entity class that extends MaterialEntityClass
   * If not provided, defaults to MaterialEntityClass
   */
  materialEntity?: EntityTarget<MaterialEntityClass>;

  /**
   * Custom Material Unit Entity class that extends MaterialUnitEntityClass
   * If not provided, defaults to MaterialUnitEntityClass
   */
  materialUnitEntity?: EntityTarget<MaterialUnitEntityClass>;
}

/**
 * Generic constraint for any entity extending a base class
 * Usage: T extends BaseEntity will ensure type safety
 */
export type EntityProvider<T extends ObjectLiteral = ObjectLiteral> = {
  provide: string | symbol;
  useValue: EntityTarget<T>;
};
