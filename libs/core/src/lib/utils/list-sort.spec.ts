import {
  Column,
  DataSource,
  Entity,
  PrimaryColumn,
  type SelectQueryBuilder,
} from 'typeorm';
import { LIST_SORT_NULLS, applyListSort, resolveListSort } from './list-sort';
import { SortOrder } from '../typings/list-sort';

/**
 * Unit coverage for the list-sort helper.
 *
 * `applyListSort` is driven against a DataSource whose metadata is built but
 * which never connects — enough to inspect the generated ORDER BY. The DISTINCT
 * subquery path itself only exists at execution time and is covered by
 * `list-sorting.integration.spec.ts`.
 */
enum ItemSortField {
  NAME = 'NAME',
  RANK = 'RANK',
  TAG = 'TAG',
  ID = 'ID',
}

@Entity('list_sort_spec_items')
class ItemSpecEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('varchar')
  name!: string;

  @Column('int', { nullable: true })
  rank!: number | null;

  @Column('varchar')
  tagId!: string;
}

@Entity('list_sort_spec_tags')
class TagSpecEntity {
  @PrimaryColumn('varchar')
  id!: string;

  @Column('varchar')
  label!: string;
}

const FIELDS: Readonly<Record<ItemSortField, string>> = {
  [ItemSortField.NAME]: 'item.name',
  [ItemSortField.RANK]: 'item.rank',
  [ItemSortField.TAG]: 'tag.label',
  [ItemSortField.ID]: 'item.id',
};

const DEFAULT = { field: ItemSortField.NAME, order: SortOrder.ASC };

describe('resolveListSort', () => {
  it('uses the requested sort, NULLS LAST, then the tiebreaker ascending', () => {
    expect(
      resolveListSort({
        sort: { field: ItemSortField.RANK, order: SortOrder.DESC },
        fields: FIELDS,
        defaultOrder: DEFAULT,
        tiebreaker: 'item.id',
      }),
    ).toEqual([
      { expression: 'item.rank', order: SortOrder.DESC, nulls: 'NULLS LAST' },
      { expression: 'item.id', order: SortOrder.ASC },
    ]);
  });

  it('pins NULLs last in both directions', () => {
    expect(LIST_SORT_NULLS).toBe('NULLS LAST');

    [SortOrder.ASC, SortOrder.DESC].forEach((order) => {
      const [first] = resolveListSort({
        sort: { field: ItemSortField.RANK, order },
        fields: FIELDS,
        defaultOrder: DEFAULT,
        tiebreaker: 'item.id',
      });

      expect(first.nulls).toBe('NULLS LAST');
    });
  });

  it.each([undefined, null])(
    'falls back to defaultOrder when sort is %p',
    (sort) => {
      expect(
        resolveListSort({
          sort,
          fields: FIELDS,
          defaultOrder: [
            { field: ItemSortField.RANK, order: SortOrder.DESC },
            { field: ItemSortField.NAME, order: SortOrder.ASC },
          ],
          tiebreaker: 'item.id',
        }).map(({ expression, order }) => `${expression} ${order}`),
      ).toEqual(['item.rank DESC', 'item.name ASC', 'item.id ASC']);
    },
  );

  it('does not append the tiebreaker when it is already the sort (it would overwrite the direction)', () => {
    expect(
      resolveListSort({
        sort: { field: ItemSortField.ID, order: SortOrder.DESC },
        fields: FIELDS,
        defaultOrder: DEFAULT,
        tiebreaker: 'item.id',
      }).map(({ expression, order }) => `${expression} ${order}`),
    ).toEqual(['item.id DESC']);
  });

  it('appends a composite tiebreaker in order, skipping columns already sorted on', () => {
    expect(
      resolveListSort({
        sort: { field: ItemSortField.ID, order: SortOrder.DESC },
        fields: FIELDS,
        defaultOrder: DEFAULT,
        tiebreaker: ['item.groupId', 'item.id', 'item.slot'],
      }).map(({ expression, order }) => `${expression} ${order}`),
    ).toEqual(['item.id DESC', 'item.groupId ASC', 'item.slot ASC']);
  });

  it('rejects a field outside the whitelist instead of falling back', () => {
    expect(() =>
      resolveListSort({
        sort: { field: 'constructor' as ItemSortField, order: SortOrder.ASC },
        fields: FIELDS,
        defaultOrder: DEFAULT,
        tiebreaker: 'item.id',
      }),
    ).toThrow('Unknown sort field "constructor"');
  });

  it('rejects an unknown direction', () => {
    expect(() =>
      resolveListSort({
        sort: { field: ItemSortField.NAME, order: 'asc' as SortOrder },
        fields: FIELDS,
        defaultOrder: DEFAULT,
        tiebreaker: 'item.id',
      }),
    ).toThrow('Unknown sort order "asc"');
  });
});

describe('applyListSort', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      entities: [ItemSpecEntity, TagSpecEntity],
    });

    // Metadata only — no connection is opened.
    await (
      dataSource as unknown as { buildMetadatas(): Promise<void> }
    ).buildMetadatas();
  });

  const itemQuery = (): SelectQueryBuilder<ItemSpecEntity> =>
    dataSource.getRepository(ItemSpecEntity).createQueryBuilder('item');

  const orderByOf = (sql: string): string =>
    sql.slice(sql.indexOf(' ORDER BY ') + ' ORDER BY '.length);

  it('replaces any existing ORDER BY and ends with the tiebreaker', () => {
    const qb = itemQuery().orderBy('item.name', 'DESC');

    applyListSort(qb, {
      sort: { field: ItemSortField.RANK, order: SortOrder.ASC },
      fields: FIELDS,
      defaultOrder: DEFAULT,
      tiebreaker: 'item.id',
    });

    expect(orderByOf(qb.getQuery())).toBe(
      '"item"."rank" ASC NULLS LAST, "item"."id" ASC',
    );
  });

  it('applies defaultOrder when no sort is given', () => {
    const qb = applyListSort(itemQuery(), {
      fields: FIELDS,
      defaultOrder: DEFAULT,
      tiebreaker: 'item.id',
    });

    expect(orderByOf(qb.getQuery())).toBe(
      '"item"."name" ASC NULLS LAST, "item"."id" ASC',
    );
  });

  it('accepts a joined column in entity mode once it is selected', () => {
    const qb = itemQuery()
      .leftJoin(TagSpecEntity, 'tag', 'tag.id = item.tagId')
      .addSelect('tag.label');

    applyListSort(qb, {
      sort: { field: ItemSortField.TAG, order: SortOrder.DESC },
      fields: FIELDS,
      defaultOrder: DEFAULT,
      tiebreaker: 'item.id',
    });

    expect(orderByOf(qb.getQuery())).toBe(
      '"tag_label" DESC NULLS LAST, "item"."id" ASC',
    );
  });

  it('rejects a joined column that is not selected (DISTINCT subquery could not see it)', () => {
    const qb = itemQuery().leftJoin(
      TagSpecEntity,
      'tag',
      'tag.id = item.tagId',
    );

    expect(() =>
      applyListSort(qb, {
        sort: { field: ItemSortField.TAG, order: SortOrder.ASC },
        fields: FIELDS,
        defaultOrder: DEFAULT,
        tiebreaker: 'item.id',
      }),
    ).toThrow('must be selected');
  });

  it('rejects an alias the query has not joined', () => {
    expect(() =>
      applyListSort(itemQuery(), {
        sort: { field: ItemSortField.TAG, order: SortOrder.ASC },
        fields: FIELDS,
        defaultOrder: DEFAULT,
        tiebreaker: 'item.id',
      }),
    ).toThrow('alias "tag" is not an entity alias');
  });

  it('rejects SQL expressions and unknown properties in entity mode', () => {
    expect(() =>
      applyListSort(itemQuery(), {
        fields: { ...FIELDS, [ItemSortField.NAME]: 'LOWER(item.name)' },
        defaultOrder: DEFAULT,
        tiebreaker: 'item.id',
      }),
    ).toThrow('must be "alias.propertyPath"');

    expect(() =>
      applyListSort(itemQuery(), {
        fields: { ...FIELDS, [ItemSortField.NAME]: 'item.nope' },
        defaultOrder: DEFAULT,
        tiebreaker: 'item.id',
      }),
    ).toThrow('"nope" is not a column');
  });

  it('uses expressions verbatim in raw mode', () => {
    const qb = itemQuery()
      .select('item.id', 'id')
      .addSelect('COALESCE(item.rank, 0)', 'score');

    applyListSort(qb, {
      mode: 'raw',
      sort: { field: ItemSortField.RANK, order: SortOrder.DESC },
      fields: { ...FIELDS, [ItemSortField.RANK]: 'score' },
      defaultOrder: DEFAULT,
      tiebreaker: 'item.id',
    });

    expect(orderByOf(qb.getQuery())).toBe(
      '"score" DESC NULLS LAST, "item"."id" ASC',
    );
  });
});
