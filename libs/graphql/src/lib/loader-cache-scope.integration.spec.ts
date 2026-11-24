import { MaterialEntityClass } from '@rytass/wms-module-core';
import { createWmsTestApp, seed, type WmsTestApp } from './testing';
import { LoaderService, createWmsLoaders } from './helpers';

/**
 * A DataLoader's cache lives as long as the request that built it, no longer.
 *
 * Every request's loaders used to share one process-wide LRU (500ms) as their
 * `cacheMap`. A field read straight after a mutation -- which is exactly what
 * Apollo's `refetchQueries` sends -- came back from before the write, and one
 * user's rows answered the next user's request. The first case fails on that
 * code; the second pins what the per-request cache is still for.
 */
describe('loader cache scope (integration)', () => {
  let ctx: WmsTestApp;
  let loaderService: LoaderService;
  let material: MaterialEntityClass;

  const describeMaterial = (description: string): Promise<unknown> =>
    ctx.dataSource
      .getRepository<MaterialEntityClass>(ctx.entities.material)
      .update(material.id, { description } as never);

  const load = (
    loaders: ReturnType<typeof createWmsLoaders>['loaders'],
  ): Promise<MaterialEntityClass> =>
    loaders.batchSingle.load({
      __entity: ctx.entities.material,
      __from: { id: material.id },
    }) as Promise<MaterialEntityClass>;

  beforeAll(async () => {
    ctx = await createWmsTestApp({ label: 'loader-cache', graphql: false });
    loaderService = ctx.get(LoaderService);
    material = await seed(ctx).material({ description: 'before' });
  });

  afterAll(async () => {
    await ctx?.close();
  });

  it('does not hand one request what another request loaded', async () => {
    const first = createWmsLoaders(loaderService).loaders;

    expect((await load(first)).description).toBe('before');

    await describeMaterial('after');

    const second = createWmsLoaders(loaderService).loaders;

    expect((await load(second)).description).toBe('after');
  });

  it('still caches within one request', async () => {
    await describeMaterial('cached');

    const { loaders } = createWmsLoaders(loaderService);
    const [a, b] = await Promise.all([load(loaders), load(loaders)]);

    await describeMaterial('changed later in the same request');

    expect(a).toBe(b);
    expect((await load(loaders)).description).toBe('cached');
  });
});
