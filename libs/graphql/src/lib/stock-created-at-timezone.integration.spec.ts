import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import { StockEntityClass } from '@rytass/wms-module-core';
import { createWmsTestApp, seed, type WmsTestApp } from './testing';

/**
 * `stocks.createdAt` is a point in time, not a wall-clock reading (#228).
 *
 * Up to `@rytass/wms-base-nestjs-module` 0.4.x the column was `timestamp`
 * (without time zone), filled by the database default `now()`. PostgreSQL
 * renders `now()` in the session's `TimeZone` before dropping the zone, so two
 * rows written at the same moment by sessions in different zones were stored
 * hours apart, and the change log sorted them in the wrong order. 0.5.0 makes
 * it `timestamptz`; these cases fail on the old column.
 */
describe('stocks.createdAt time zone (integration)', () => {
  let ctx: WmsTestApp;
  let tableName: string;
  let materialId: string;
  let batchId: string;
  let locationId: string;

  /** Insert one stock row on a session whose TimeZone is `zone`; returns its id. */
  const insertIn = async (zone: string): Promise<string> => {
    const runner = ctx.dataSource.createQueryRunner();

    try {
      await runner.connect();
      await runner.query(`SET TIME ZONE '${zone}'`);

      const orders = runner.manager.getRepository<OrderEntity>(
        ctx.entities.order,
      );
      const order = await orders.save(orders.create({}));

      const result = await runner.manager
        .createQueryBuilder()
        .insert()
        .into(ctx.entities.stock)
        .values({
          materialId,
          batchId,
          locationId,
          orderId: order.id,
          loaderId: 'DEFAULT',
          quantity: 1,
        } as never)
        .returning('id')
        .execute();

      return (result.raw as { id: string }[])[0].id;
    } finally {
      await runner.release();
    }
  };

  beforeAll(async () => {
    ctx = await createWmsTestApp({ label: 'stock-created-at', graphql: false });
    tableName = ctx.dataSource.getMetadata(ctx.entities.stock).tableName;

    const seeder = seed(ctx);
    const material = await seeder.material();
    const location = await seeder.location();
    const batch = await seeder.batch({ materialId: material.id });

    materialId = material.id;
    batchId = batch.id;
    locationId = location.id;
  });

  afterAll(async () => {
    await ctx?.close();
  });

  it('is declared timestamptz after synchronize', async () => {
    const [column] = (await ctx.dataSource.query(
      `SELECT data_type FROM information_schema.columns
        WHERE table_name = $1 AND column_name = 'createdAt'`,
      [tableName],
    )) as { data_type: string }[];

    expect(column.data_type).toBe('timestamp with time zone');
  });

  it('records the same moment whatever the writing session time zone', async () => {
    const taipeiId = await insertIn('Asia/Taipei');
    const utcId = await insertIn('UTC');
    const newYorkId = await insertIn('America/New_York');

    const rows = await ctx.dataSource
      .getRepository<StockEntityClass>(ctx.entities.stock)
      .findBy([{ id: taipeiId }, { id: utcId }, { id: newYorkId }]);

    const times = rows.map(({ createdAt }) => createdAt.getTime());
    const spread = Math.max(...times) - Math.min(...times);

    // Written within a second of each other; a wall-clock column spreads them
    // across the zones' offsets (13 hours here).
    expect(rows).toHaveLength(3);
    expect(spread).toBeLessThan(60_000);
  });
});
