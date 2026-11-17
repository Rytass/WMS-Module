# Server-side list sorting

Every read-only list sorts on the server. The table header (Mezzanine
`TableColumn.onSort` / `sortOrder`) drives a `sort` argument on the list query;
the service turns it into ORDER BY through one helper. The reference
implementation is the materials list (`materials` query,
`MaterialService.findMany`, `materials-management/Table`).

Contract every list keeps:

- `sort` is optional. Omitted, the list uses a **documented, deterministic
  default** (materials: `createdAt DESC`).
- Only whitelisted fields sort. Anything else throws — never a silent fallback.
- NULLs sort **last in both directions** (`LIST_SORT_NULLS`).
- The primary key is always appended last, ascending, as the tiebreaker, so
  `LIMIT`/`OFFSET` pages never repeat or skip rows.
- Sort state lives in component state only (not the URL); changing it resets
  the table to page 1.

## Backend

### 1. Field enum and input type (core)

In the list's `find-*.input.ts` (`libs/core/src/lib/typings`):

```ts
export enum ReceiveOrderSortField {
  KEY = 'KEY',
  CREATED_AT = 'CREATED_AT',
}

export type FindReceiveInventoryOrderInput = PaginationInput & {
  // ...filters
  /** Omitted: <describe the default>. */
  sort?: ListSort<ReceiveOrderSortField> | null;
};
```

Enum values become schema values: add freely, never rename or remove.

Pick fields that are **single-valued per row and meaningful to order by**. A
one-to-many column (a material's unit conversions, an order's items) cannot be
sorted without a join that multiplies rows — leave it out.

### 2. Apply the sort in the service

```ts
const RECEIVE_ORDER_SORT_FIELDS: Readonly<
  Record<ReceiveOrderSortField, string>
> = {
  [ReceiveOrderSortField.KEY]: 'order.key',
  [ReceiveOrderSortField.CREATED_AT]: 'order.createdAt',
};

applyListSort(qb, {
  sort: options.sort,
  fields: RECEIVE_ORDER_SORT_FIELDS,
  defaultOrder: {
    field: ReceiveOrderSortField.CREATED_AT,
    order: SortOrder.DESC,
  },
  tiebreaker: 'order.id',
  mode: 'raw', // only for getRawMany() lists
});
```

`applyListSort` (`libs/core/src/lib/utils/list-sort.ts`) replaces any existing
ORDER BY. Call it **after** the joins its expressions need and before
pagination. `defaultOrder` may be an array for a multi-column default.

Pick the mode by how the list is read:

| List reads with               | `mode`             | Expression form                  | Paginate with      |
| ----------------------------- | ------------------ | -------------------------------- | ------------------ |
| `getMany` / `getManyAndCount` | `entity` (default) | `alias.propertyPath` only        | `skip` / `take`    |
| `getRawMany`                  | `raw`              | selected alias (`status`) or SQL | `offset` / `limit` |

A list whose row has no single-column key (an aggregate) passes its group key
as the tiebreaker, `tiebreaker: ['agg."materialId"', 'agg."batchId"', …]`; a
column already used as the sort criterion is skipped. `findAggregatedStocks`
is the example: it joins what a sort field needs (material, batch group,
location, loader, unit) only for that field, so an unsorted call keeps its
plain query. `findManyGroupedByMaterialId` shows the other raw shape: the
material repository as main alias (soft delete and discriminator still apply),
the per-material `SUM` as an inner-joined subquery, `getRawAndEntities()`
with `offset`/`limit`, and `COUNT(*) OVER ()` for the total.

Embedding one single-table child's query inside another's: TypeORM names
every discriminator parameter `discriminatorColumnValues`, so the outer
query's value overwrites the inner one. Rename the inner placeholder, as
`findManyGroupedByMaterialId` does.

Entity mode is strict because of TypeORM's paginated DISTINCT subquery (used as
soon as `skip`/`take` meets a join): it rewrites each ORDER BY key into a column
of the subquery, which only works for a property path on an alias with
metadata **whose column is in the SELECT**. The helper checks this up front and
throws with the fix in the message. For a joined column:

```ts
qb.leftJoin(
  UnitEntityClass,
  'baseUnit',
  'CAST(baseUnit.id AS text) = material.baseUnit',
).addSelect('baseUnit.key'); // required — the DISTINCT subquery must see it
```

- Join **by entity class**, never by table-name string — the table prefix and
  the subquery both resolve it from metadata. For an overridable entity that
  class is the one `WmsEntities` resolved (`this.entities.location`,
  `this.entities.material`, …), never the imported built-in class.
- The join must stay **one row per list row** (join on a unique key).
- Write casts as `CAST(x AS t)`, not `x::t`: TypeORM only rewrites
  `alias.property` when a space, `=`, `)` or `,` follows it.
- A join only needed for sorting can be added conditionally
  (`if (options.sort?.field === …)`), as `MaterialService.findMany` does.
- A list with **no ORDER BY at all** today paginates unstably — the default
  order fixes that, which is part of the point.
- Make the service method `async` so a rejected sort surfaces as a rejected
  promise, not a synchronous throw.

### 3. GraphQL (graphql)

In the list's `find-*.args.ts`:

```ts
registerEnumType(ReceiveOrderSortField, { name: 'ReceiveOrderSortField' });

@InputType()
export class ReceiveOrderSortInput extends SortInput(ReceiveOrderSortField) {}

@ArgsType()
export class FindReceiveInventoryOrderArgs extends PaginationArgs {
  // ...
  @Field(() => ReceiveOrderSortInput, {
    nullable: true,
    description: 'Omitted: <the default>.',
  })
  sort?: ReceiveOrderSortInput | null;
}
```

Names: `<List>SortField`, `<List>SortInput`; the shared `SortOrder { ASC, DESC }`
is registered once in `inputs/sort.input.ts`. Make sure the resolver forwards
`sort` to the service (most spread `...args`).

### 4. Regenerate

1. Start the api so `autoSchemaFile` rewrites `schema.gql`. Point it at a local
   database, not the shared one: `VAULT_HOST=` (empty) makes the Vault adapter
   read `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`, `DB_SCHEMA` from the
   environment; use another `PORT` if 7103 is taken.
2. Add `$sort: <List>SortInput` to the `.gql` query in
   `libs/react/src/graphql/queries` and pass `sort: $sort`.
3. `yarn gql`. Commit `schema.gql` and `generated/.graphql.ts`.

Parallel branches touching the schema conflict in both files; resolve by
regenerating (steps 1 and 3) after the merge, never by hand.

## Frontend

`useTableSort` (`libs/react/src/hooks/useTableSort.ts`):

```ts
const SORT_FIELDS = {
  key: ReceiveOrderSortField.KEY, // column key → GraphQL sort field
  createdAt: ReceiveOrderSortField.CREATED_AT,
} as const;

const { page, setPage, limit, offset } = useTablePageState();
const { sort, getColumnSortProps } = useTableSort({
  fields: SORT_FIELDS,
  setPage,
});

useQuery(ReceiveInventoryOrdersDocument, {
  variables: { offset, limit, sort },
});

const columns: TableColumn<Row>[] = [
  { key: 'key', title: '單號', ...getColumnSortProps('key') },
];
```

- `sort` is `undefined` when no column is sorted, so the server default applies.
- `getColumnSortProps(key)` returns `{ onSort, sortOrder }`; only keys in
  `fields` type-check. Mezzanine cycles a header ascend → descend → none.
- `setPage(1)` runs in the same event as the sort change — one request, first
  page.
- Leave the query variables to the hook; do not put `sort` in the URL.
- Check the sort icon is clickable: in a narrow column (long title, `align:
'center'`) the icon lands under the column resize handle and the click goes
  nowhere. Widen the column (`width`) until it clears.

## Tests

1. **Integration, one entry per list** —
   `libs/graphql/src/lib/list-sorting.integration.spec.ts`. Add a
   `ListSortCase` and a `describeListSort(yourCase, () => context)` line:
   - `sortFields`: the enum — every value is swept, ASC and DESC;
   - `seed`: create rows, return `Map<id, Record<field, value>>` with each row's
     sort values (what the expected order is computed from);
   - `fetchPage`: usually `graphqlPage('<rootField>')`; pass extra literal
     arguments as the second parameter if the query needs them;
   - `defaultOrder`: what the list promises without `sort`.

   It checks the full order (NULLs last, ties by `id`), that `LIMIT`-sized
   pages are disjoint and add up to `total`, and the default order. Fixture
   rules (in the spec header): lowercase ASCII strings of one length so any
   collation agrees with JS, **duplicates in every sortable column**, a NULL
   where the column can be NULL, explicit timestamps (`@CreateDateColumn`
   ignores an insert value — `update` it afterwards).

2. **Direct service call** — per CLAUDE.md, call the exported service method
   with `sort` omitted (`app.get(TheService).findMany({})`) and assert the
   default order; see the `MaterialService.findMany called directly` block.
3. Run the spec once with `WMS_TEST_TABLE_PREFIX=wms_` too.
4. Browser: for each sortable column, ascend / descend / clear, and page 2 in
   each state; confirm sorting from page 2 lands on page 1.

The helper itself is covered by `libs/graphql/src/lib/list-sort.spec.ts` (core
has no jest target).
