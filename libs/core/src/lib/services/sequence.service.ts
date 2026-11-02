import { Inject, Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { SequenceEntityClass } from '../models/metadata/sequence.entity';
import { getWmsTablePrefix } from '../table-prefix/logical-table-name';
import {
  WMS_CORE_MODULE_OPTIONS,
  type WmsModuleCoreModuleOptions,
} from '../typings/core-module-options';
import { runInTransaction } from '../utils/run-in-transaction';

const quoteIdentifier = (name: string): string =>
  `"${name.replace(/"/g, '""')}"`;

const outOfRange = (name: string, maxValue: number, end: number): Error =>
  new Error(
    `SEQUENCE_OUT_OF_RANGE: ${name} exceeds ${maxValue} (requested up to ${end})`,
  );

/**
 * Hands out the numbers behind order keys and loader serials.
 *
 * `reserve(name, count)` returns the first of `count` **consecutive** numbers
 * nobody else has been or will be given, inside the caller's transaction when
 * there is one. It never lets a statement fail on purpose, so it is safe in a
 * transaction (#185: the old loader path probed with `CURRVAL` and caught the
 * error, which aborts a PostgreSQL transaction, and `CURRVAL` is per session,
 * so pooled connections reissued each other's serials).
 *
 * Storage follows `sequenceStorage` — see `WmsModuleCoreModuleOptions`.
 */
@Injectable()
export class WmsSequenceService {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(WMS_CORE_MODULE_OPTIONS)
    private readonly options: WmsModuleCoreModuleOptions,
  ) {}

  /**
   * Reserve `count` numbers of counter `name` and return the first.
   *
   * @param consecutive the run must be gap-free and uninterrupted (loader
   * serials). Every reservation of a counter that is ever reserved this way
   * must pass it, or a lone `nextval` could land inside someone else's run.
   * @param maxValue the last number the counter may hand out. A reservation
   * that would run past it is refused **before** the counter moves: a
   * PostgreSQL sequence does not roll back, and a host that catches the error
   * and commits anyway would otherwise keep the advance in table mode too.
   * Implies `consecutive`, since the check reads the counter before moving it.
   */
  reserve(
    name: string,
    count = 1,
    manager?: EntityManager,
    {
      maxValue,
      consecutive = count > 1 || maxValue !== undefined,
    }: { readonly consecutive?: boolean; readonly maxValue?: number } = {},
  ): Promise<number> {
    if (!Number.isInteger(count) || count < 1) {
      return Promise.reject(
        new Error(
          `WmsSequenceService: count must be a positive integer, got ${count}`,
        ),
      );
    }

    if (maxValue !== undefined && count > maxValue) {
      return Promise.reject(outOfRange(name, maxValue, count));
    }

    return runInTransaction(this.dataSource, manager, (transactionManager) =>
      this.options.sequenceStorage === 'table'
        ? this.reserveRow(name, count, transactionManager, maxValue)
        : this.reserveSequence(
            name,
            count,
            transactionManager,
            consecutive || maxValue !== undefined,
            maxValue,
          ),
    );
  }

  /**
   * One statement, atomic whatever the session: the row lock it takes is held
   * to commit, so concurrent callers of one counter queue rather than collide,
   * and a rollback takes the increment back with it.
   */
  private async reserveRow(
    name: string,
    count: number,
    manager: EntityManager,
    maxValue?: number,
  ): Promise<number> {
    const table = manager
      .getRepository(SequenceEntityClass)
      .metadata.tablePath.split('.')
      .map(quoteIdentifier)
      .join('.');

    // The WHERE refuses an advance past maxValue in the same statement, so
    // the row is never moved and there is nothing for a rollback to undo.
    // (The first insert cannot overrun: `reserve` already checked count.)
    const rows = await manager.query<{ value: string }[]>(
      `INSERT INTO ${table} ("key", "value") VALUES ($1, $2)
       ON CONFLICT ("key") DO UPDATE SET "value" = ${table}."value" + EXCLUDED."value"
       WHERE $3::bigint IS NULL OR ${table}."value" + EXCLUDED."value" <= $3::bigint
       RETURNING "value"`,
      [name, count, maxValue ?? null],
    );

    if (rows.length === 0) {
      throw outOfRange(name, maxValue as number, Number.NaN);
    }

    return Number(rows[0].value) - count + 1;
  }

  /**
   * A single number is one `nextval`, atomic across sessions -- order keys
   * need nothing more. A consecutive run (loader serials) is `nextval` then
   * `setval`, two statements another session could slip a `nextval` between,
   * so every reservation of a counter that hands out runs holds that counter's
   * transaction-scoped lock. Transaction-scoped on purpose: a session lock
   * would outlive a failed statement on a pooled connection.
   */
  private async reserveSequence(
    name: string,
    count: number,
    manager: EntityManager,
    consecutive: boolean,
    maxValue?: number,
  ): Promise<number> {
    const sequence = quoteIdentifier(`${getWmsTablePrefix()}${name}`);

    if (consecutive) {
      await manager.query(
        `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
        [`wms:sequence:${sequence}`],
      );
    }

    // Probe instead of letting CREATE race: `IF NOT EXISTS` still raises a
    // unique violation when two sessions create the same sequence at once.
    // Probed on a connection of its own, like the CREATE below: a lookup that
    // misses inside the caller's transaction leaves that backend caching the
    // miss, and its `nextval` then fails with "does not exist" even after
    // another session has created and committed the sequence.
    const [{ exists }] = await this.dataSource.query<[{ exists: boolean }]>(
      `SELECT to_regclass($1) IS NOT NULL AS "exists"`,
      [sequence],
    );

    /*
     * Created on a connection of its own, in autocommit -- never inside the
     * caller's transaction. Created inside it, the new sequence would be
     * invisible to everyone else until that transaction commits: every other
     * caller of the counter would block on the catalog row behind it (with
     * one sequence per order type per day, the first order of the day would
     * serialise all the others), and a rollback would drop the sequence again.
     * A failed CREATE here also cannot abort the caller's transaction.
     */
    if (!exists) {
      await this.dataSource
        .query(`CREATE SEQUENCE IF NOT EXISTS ${sequence}`)
        .catch(async (error: unknown) => {
          // Lost a creation race with another session: fine if it now exists.
          const [{ created }] = await this.dataSource.query<
            [{ created: boolean }]
          >(`SELECT to_regclass($1) IS NOT NULL AS "created"`, [sequence]);

          if (!created) throw error;
        });
    }

    if (maxValue !== undefined) {
      // Safe to read then move: every reservation with a bound holds this
      // counter's lock, taken above.
      const [{ next }] = await manager.query<[{ next: string }]>(
        `SELECT CASE WHEN is_called THEN last_value + 1 ELSE last_value END AS "next"
         FROM ${sequence}`,
      );
      const end = Number(next) + count - 1;

      if (end > maxValue) throw outOfRange(name, maxValue, end);
    }

    const [{ first }] = await manager.query<[{ first: string }]>(
      `SELECT nextval($1::regclass) AS "first"`,
      [sequence],
    );

    if (count > 1) {
      await manager.query(`SELECT setval($1::regclass, $2)`, [
        sequence,
        Number(first) + count - 1,
      ]);
    }

    return Number(first);
  }
}
