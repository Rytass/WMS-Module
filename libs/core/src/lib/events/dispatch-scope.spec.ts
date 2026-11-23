import { collectToScope, runInDispatchScope } from './dispatch-scope';
import type { WmsDomainEvent } from './wms-event.types';

const event = (name: string): WmsDomainEvent =>
  ({ name, payload: {} }) as unknown as WmsDomainEvent;

describe('dispatch scope', () => {
  it('ignores collectToScope outside a scope', () => {
    expect(() => collectToScope(event('stock.received'))).not.toThrow();
  });

  it('hands the outermost owner every collected event', async () => {
    const { result, events } = await runInDispatchScope(async () => {
      collectToScope(event('a'));
      collectToScope(event('b'));

      return 42;
    });

    expect(result).toBe(42);
    expect(events?.map((e) => e.name)).toEqual(['a', 'b']);
  });

  it('collects across await boundaries', async () => {
    const { events } = await runInDispatchScope(async () => {
      await Promise.resolve();
      await new Promise((resolve) => setImmediate(resolve));
      collectToScope(event('late'));
    });

    expect(events?.map((e) => e.name)).toEqual(['late']);
  });

  it('lets a nested run join the outer scope: only the outermost flushes', async () => {
    const outer = await runInDispatchScope(async () => {
      collectToScope(event('outer'));

      const inner = await runInDispatchScope(async () => {
        collectToScope(event('inner'));

        return 'inner-result';
      });

      return inner;
    });

    expect(outer.result.result).toBe('inner-result');
    expect(outer.result.events).toBeNull();
    expect(outer.events?.map((e) => e.name)).toEqual(['outer', 'inner']);
  });

  it('keeps concurrent scopes apart', async () => {
    const [a, b] = await Promise.all([
      runInDispatchScope(async () => {
        await new Promise((resolve) => setImmediate(resolve));
        collectToScope(event('a'));
      }),
      runInDispatchScope(async () => {
        collectToScope(event('b'));
      }),
    ]);

    expect(a.events?.map((e) => e.name)).toEqual(['a']);
    expect(b.events?.map((e) => e.name)).toEqual(['b']);
  });

  it('starts a fresh scope after the previous one ended', async () => {
    await runInDispatchScope(async () => collectToScope(event('first')));
    const second = await runInDispatchScope(async () => undefined);

    expect(second.events).toEqual([]);
  });

  it('propagates a failure and leaves no scope behind', async () => {
    await expect(
      runInDispatchScope(async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    const next = await runInDispatchScope(async () => undefined);

    expect(next.events).not.toBeNull();
  });
});
