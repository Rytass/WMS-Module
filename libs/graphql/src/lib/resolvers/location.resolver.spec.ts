import { LocationEntityClass } from '@rytass/wms-module-core';
import { LocationResolver } from './location.resolver';
import type { LoaderOptions, LoaderType } from '../helpers';

type LocationContext = LoaderType<LocationEntityClass>;

interface LoaderMocks {
  readonly context: LocationContext;
  readonly batchMany: jest.Mock;
  readonly batchSingle: jest.Mock;
}

const createLoaderMocks = (): LoaderMocks => {
  const batchMany = jest.fn();
  const batchSingle = jest.fn();

  return {
    batchMany,
    batchSingle,
    context: {
      loaders: {
        batchMany: { load: batchMany },
        batchSingle: { load: batchSingle },
        batchManyWithPagination: { load: jest.fn() },
      },
    } as unknown as LocationContext,
  };
};

const createLocation = (
  overrides: Partial<LocationEntityClass> & { id: string },
): LocationEntityClass =>
  Object.assign(new LocationEntityClass(), {
    key: `KEY-${overrides.id}`,
    description: '',
    isActive: true,
    ...overrides,
  });

describe('LocationResolver', () => {
  describe('children', () => {
    it('resolves children through the request-scoped batchMany loader', async () => {
      const resolver = new LocationResolver();
      const { context, batchMany } = createLoaderMocks();
      const children = [
        createLocation({ id: 'child-a', key: 'A', parentId: 'parent-1' }),
        createLocation({ id: 'child-b', key: 'B', parentId: 'parent-1' }),
      ];

      batchMany.mockResolvedValue(children);

      const parent = createLocation({ id: 'parent-1', key: 'P' });

      await expect(resolver.children(parent, context)).resolves.toEqual(
        children,
      );

      expect(batchMany).toHaveBeenCalledTimes(1);

      const [options] = batchMany.mock.calls[0] as [
        LoaderOptions<LocationEntityClass>,
      ];

      expect(options.__entity).toBe(LocationEntityClass);
      expect(options.__from).toEqual({ parentId: 'parent-1' });
    });

    it('returns an empty array for a leaf location without erroring', async () => {
      const resolver = new LocationResolver();
      const { context, batchMany } = createLoaderMocks();

      batchMany.mockResolvedValue([]);

      await expect(
        resolver.children(createLocation({ id: 'leaf' }), context),
      ).resolves.toEqual([]);
    });

    it('queries the loader even when the entity carries no children relation', async () => {
      const resolver = new LocationResolver();
      const { context, batchMany } = createLoaderMocks();
      const loaded = [createLocation({ id: 'child', parentId: 'parent-2' })];

      batchMany.mockResolvedValue(loaded);

      // A location handed over by `batchSingle` (e.g. `StockResolver.location`)
      // never has the TypeORM tree relation hydrated — this is the shape that
      // used to blow up with "Cannot return null for non-nullable field".
      const unhydrated = createLocation({ id: 'parent-2' });

      expect(unhydrated.children).toBeUndefined();

      await expect(resolver.children(unhydrated, context)).resolves.toEqual(
        loaded,
      );
    });

    it('ignores an eagerly loaded children relation in favour of the loader', async () => {
      const resolver = new LocationResolver();
      const { context, batchMany } = createLoaderMocks();
      const fresh = [createLocation({ id: 'fresh', parentId: 'parent-3' })];

      batchMany.mockResolvedValue(fresh);

      const eagerlyLoaded = createLocation({
        id: 'parent-3',
        children: [createLocation({ id: 'stale', parentId: 'parent-3' })],
      });

      await expect(resolver.children(eagerlyLoaded, context)).resolves.toEqual(
        fresh,
      );
    });

    it('orders children deterministically by key', async () => {
      const resolver = new LocationResolver();
      const { context, batchMany } = createLoaderMocks();

      batchMany.mockResolvedValue([]);

      await resolver.children(createLocation({ id: 'parent-4' }), context);

      const [options] = batchMany.mock.calls[0] as [
        LoaderOptions<LocationEntityClass>,
      ];

      expect(options.__conditions).toBeDefined();

      const orderBy = jest.fn().mockReturnThis();

      options.__conditions?.({ orderBy } as never);

      expect(orderBy).toHaveBeenCalledWith('entity."key"', 'ASC');
    });
  });

  describe('parent', () => {
    it('returns null when the location is a root', () => {
      const resolver = new LocationResolver();
      const { context, batchSingle } = createLoaderMocks();

      expect(
        resolver.parent(
          createLocation({ id: 'root', parentId: null }),
          context,
        ),
      ).toBeNull();
      expect(batchSingle).not.toHaveBeenCalled();
    });

    it('loads the parent through batchSingle', async () => {
      const resolver = new LocationResolver();
      const { context, batchSingle } = createLoaderMocks();
      const parent = createLocation({ id: 'parent-5' });

      batchSingle.mockResolvedValue(parent);

      await expect(
        resolver.parent(
          createLocation({ id: 'child', parentId: 'parent-5' }),
          context,
        ),
      ).resolves.toEqual(parent);

      expect(batchSingle).toHaveBeenCalledWith({
        __entity: LocationEntityClass,
        __from: { id: 'parent-5' },
      });
    });
  });
});
