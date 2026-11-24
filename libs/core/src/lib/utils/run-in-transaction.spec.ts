import type { DataSource, EntityManager } from 'typeorm';
import { runInTransaction } from './run-in-transaction';

interface FakeManager {
  readonly queryRunner?: { readonly isTransactionActive: boolean };
  readonly transaction: jest.Mock;
}

const fakeManager = (isTransactionActive?: boolean): FakeManager => {
  const manager: FakeManager = {
    queryRunner:
      isTransactionActive === undefined ? undefined : { isTransactionActive },
    transaction: jest.fn(
      async (work: (m: EntityManager) => Promise<unknown>): Promise<unknown> =>
        work({ tag: 'tx' } as unknown as EntityManager),
    ),
  };

  return manager;
};

describe('runInTransaction', () => {
  it('uses a manager already inside a transaction as is, opening nothing', async () => {
    const caller = fakeManager(true);
    const dataSource = { manager: fakeManager() } as unknown as DataSource;
    const work = jest.fn(async (m: EntityManager) => m);

    const result = await runInTransaction(
      dataSource,
      caller as unknown as EntityManager,
      work,
    );

    expect(result).toBe(caller);
    expect(caller.transaction).not.toHaveBeenCalled();
    expect(work).toHaveBeenCalledTimes(1);
  });

  it('opens a transaction on a manager that has none (autocommit)', async () => {
    const caller = fakeManager(false);
    const dataSource = { manager: fakeManager() } as unknown as DataSource;

    const result = await runInTransaction(
      dataSource,
      caller as unknown as EntityManager,
      async (m) => m,
    );

    expect(caller.transaction).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ tag: 'tx' });
  });

  it('treats a manager without a query runner as having no transaction', async () => {
    const caller = fakeManager();

    await runInTransaction(
      { manager: fakeManager() } as unknown as DataSource,
      caller as unknown as EntityManager,
      async () => 1,
    );

    expect(caller.transaction).toHaveBeenCalledTimes(1);
  });

  it('opens a transaction on the data source when no manager is given', async () => {
    const own = fakeManager();

    const result = await runInTransaction(
      { manager: own } as unknown as DataSource,
      undefined,
      async () => 'done',
    );

    expect(own.transaction).toHaveBeenCalledTimes(1);
    expect(result).toBe('done');
  });

  it('propagates a failure of the work', async () => {
    await expect(
      runInTransaction(
        { manager: fakeManager() } as unknown as DataSource,
        undefined,
        async () => {
          throw new Error('boom');
        },
      ),
    ).rejects.toThrow('boom');
  });
});
