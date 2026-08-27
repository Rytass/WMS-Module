import { OrderEntity as BaseOrderEntity } from '@rytass/wms-base-nestjs-module';

export const OrderEntity = Symbol('OrderEntity');

/**
 * Orders are the one domain this package adds no columns to, so the entity the
 * `OrderEntity` Symbol falls back to is the base class itself. The alias exists
 * for symmetry with every other entity in this folder — services and DTOs can
 * keep referring to `OrderEntityClass` without caring where it is declared.
 */
export { BaseOrderEntity as OrderEntityClass };
