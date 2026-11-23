import { Logger } from '@nestjs/common';
import { WmsEventDispatcher } from './wms-event.dispatcher';
import type {
  WmsBeforeHookContext,
  WmsDomainEvent,
  WmsEventEmitterBridge,
  WmsEventModuleOptions,
} from './wms-event.types';

const make = (
  options: WmsEventModuleOptions,
  bridge: WmsEventEmitterBridge | null = null,
): WmsEventDispatcher => new WmsEventDispatcher(options, bridge);

const stockEvent = (name: string): WmsDomainEvent =>
  ({ name, payload: { id: name } }) as unknown as WmsDomainEvent;

describe('WmsEventDispatcher', () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  describe('isActive', () => {
    it('is false with nothing wired', () => {
      expect(make({}).isActive()).toBe(false);
      expect(make({ beforeHooks: {}, afterListeners: {} }).isActive()).toBe(
        false,
      );
    });

    it('is true with a bridge', () => {
      expect(make({}, { forward: jest.fn() }).isActive()).toBe(true);
    });

    it('is true with a before-hook or an after-listener', () => {
      expect(
        make({
          beforeHooks: { 'stock.received': jest.fn() } as never,
        }).isActive(),
      ).toBe(true);
      expect(
        make({
          afterListeners: { 'stock.received': jest.fn() } as never,
        }).isActive(),
      ).toBe(true);
    });
  });

  describe('runBeforeHook', () => {
    const context = {
      event: 'receive-order.received',
      args: {},
      executionContext: null,
      source: 'host',
      actor: null,
    } as unknown as WmsBeforeHookContext;

    it('does nothing without a hook for the event', async () => {
      await expect(make({}).runBeforeHook(context)).resolves.toBeUndefined();
    });

    it('calls the hook with the context and lets a throw veto', async () => {
      const hook = jest.fn().mockRejectedValue(new Error('veto'));
      const dispatcher = make({
        beforeHooks: { 'receive-order.received': hook } as never,
      });

      await expect(dispatcher.runBeforeHook(context)).rejects.toThrow('veto');
      expect(hook).toHaveBeenCalledWith(context);
    });
  });

  describe('flush', () => {
    it('delivers each event to its listener and to the bridge, in order', async () => {
      const order: string[] = [];
      const listener = jest.fn(async ({ event }: { event: string }) => {
        order.push(`listener:${event}`);
      });
      const bridge = {
        forward: jest.fn((e: WmsDomainEvent) => order.push(`bridge:${e.name}`)),
      };

      await make(
        { afterListeners: { a: listener, b: listener } as never },
        bridge,
      ).flush([stockEvent('a'), stockEvent('b')]);

      expect(order).toEqual([
        'listener:a',
        'bridge:a',
        'listener:b',
        'bridge:b',
      ]);
    });

    it('skips events without a listener but still forwards them', async () => {
      const bridge = { forward: jest.fn() };

      await make({}, bridge).flush([stockEvent('x')]);

      expect(bridge.forward).toHaveBeenCalledTimes(1);
    });

    it('isolates a throwing listener: the bridge and later events still run', async () => {
      const bridge = { forward: jest.fn() };
      const second = jest.fn();
      const dispatcher = make(
        {
          afterListeners: {
            a: jest.fn().mockRejectedValue(new Error('listener down')),
            b: second,
          } as never,
        },
        bridge,
      );

      await expect(
        dispatcher.flush([stockEvent('a'), stockEvent('b')]),
      ).resolves.toBeUndefined();

      expect(bridge.forward).toHaveBeenCalledTimes(2);
      expect(second).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('listener down'),
      );
    });

    it('isolates a throwing bridge', async () => {
      const dispatcher = make(
        {},
        {
          forward: jest.fn(() => {
            throw new Error('bridge down');
          }),
        },
      );

      await expect(
        dispatcher.flush([stockEvent('a')]),
      ).resolves.toBeUndefined();
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('bridge down'),
      );
    });

    it('logs a non-Error rejection as a string', async () => {
      const dispatcher = make(
        {
          afterListeners: { a: jest.fn().mockRejectedValue('plain') } as never,
        },
        {
          forward: jest.fn(() => {
            throw 'plain-bridge';
          }),
        },
      );

      await dispatcher.flush([stockEvent('a')]);

      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('plain'));
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('plain-bridge'),
      );
    });

    it('is a no-op for no events', async () => {
      const bridge = { forward: jest.fn() };

      await make({}, bridge).flush([]);

      expect(bridge.forward).not.toHaveBeenCalled();
    });
  });
});
