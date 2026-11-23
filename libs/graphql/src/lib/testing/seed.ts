import type { DeepPartial } from 'typeorm';
import {
  BatchService,
  type BatchEntityClass,
  type LocationEntityClass,
  type MaterialEntityClass,
} from '@rytass/wms-module-core';
import type { WmsTestApp } from './create-wms-test-app';

let counter = 0;

const next = (prefix: string): string => `${prefix}-${++counter}`;

export interface Seeder {
  material(
    overrides?: Partial<MaterialEntityClass>,
  ): Promise<MaterialEntityClass>;
  location(
    overrides?: Partial<LocationEntityClass>,
  ): Promise<LocationEntityClass>;
  batch(
    overrides: { materialId: string } & Partial<BatchEntityClass>,
  ): Promise<BatchEntityClass>;
}

/**
 * Master data every spec otherwise inlines. Keys are unique per call, so a
 * spec can seed as many as it likes without a collision.
 *
 * Stock itself is deliberately not seeded here: it should arrive through
 * `ReceiveInventoryOrderService`, not by writing `stocks` rows, so that the
 * ledger a test starts from is one the module could actually have produced.
 * That helper lands with the first spec that needs it.
 */
export const seed = (ctx: WmsTestApp): Seeder => ({
  material: async (overrides = {}) => {
    const repository = ctx.dataSource.getRepository<MaterialEntityClass>(
      ctx.entities.material,
    );

    return repository.save(
      repository.create({
        key: next('MATERIAL'),
        ...overrides,
      } as DeepPartial<MaterialEntityClass>),
    );
  },
  location: async (overrides = {}) => {
    const repository = ctx.dataSource.getRepository<LocationEntityClass>(
      ctx.entities.location,
    );

    return repository.save(
      repository.create({
        key: next('LOCATION'),
        description: 'location',
        isActive: true,
        ...overrides,
      } as DeepPartial<LocationEntityClass>),
    );
  },
  batch: async ({ materialId, key, ...rest }) => {
    const batch = await ctx
      .get(BatchService)
      .getBatch({ key: key ?? next('BATCH'), materialId });

    return Object.keys(rest).length
      ? ctx.dataSource
          .getRepository<BatchEntityClass>(ctx.entities.batch)
          .save({ ...batch, ...rest } as DeepPartial<BatchEntityClass>)
      : batch;
  },
});
