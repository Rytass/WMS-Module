import type { DataSource, EntityManager } from 'typeorm';

/**
 * Run `work` inside the caller's transaction when there is one, otherwise open
 * one.
 *
 * Every public method that writes `stocks` or a `*_order_changes` row takes an
 * optional trailing `manager` and goes through here, so a host can put a WMS
 * movement in the same transaction as its own writes (an outbox row, a status
 * change on its own document) and have all of it commit or roll back together.
 *
 * - A manager bound to an active transaction is used as is: no savepoint, no
 *   second connection. Every read and write inside `work` must go through the
 *   `manager` it is handed — reaching for `this.dataSource` or an injected
 *   repository would run on another connection, outside the caller's
 *   transaction, and once B3's slot locks are held it would wait on them
 *   forever.
 * - A manager without a transaction (`dataSource.manager`, which several
 *   in-repo callers still pass) gets one opened on it. A lock taken in
 *   autocommit mode is released by the very statement that took it, so
 *   running unwrapped would silently drop the guarantee.
 * - No manager: a new transaction on the data source, as before.
 */
export const runInTransaction = <R>(
  dataSource: DataSource,
  manager: EntityManager | undefined,
  work: (manager: EntityManager) => Promise<R>,
): Promise<R> => {
  if (manager?.queryRunner?.isTransactionActive) return work(manager);

  return (manager ?? dataSource.manager).transaction((transactionManager) =>
    work(transactionManager),
  );
};
