import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { ListSort, SortOrder } from '../typings/list-sort';

/**
 * How the list is read, which decides what an ORDER BY expression may be.
 *
 * - `entity` — `getMany()` / `getManyAndCount()`. Every expression must be an
 *   `alias.propertyPath` naming a mapped column. With `skip`/`take` and a join
 *   TypeORM wraps the query in a `DISTINCT` subquery and rewrites each ORDER BY
 *   key into a column of that subquery; it can only do that for a property path
 *   on an alias with metadata, and only if that column is in the inner SELECT.
 *   Anything else (a function call, a raw column name, an unselected join) is
 *   either rejected by TypeORM or silently resolves to a column that does not
 *   exist, so `applyListSort` checks it up front.
 * - `raw` — `getRawMany()` paginated with `offset`/`limit`. Expressions are
 *   used verbatim: a selected alias (`status`), or SQL over the query's aliases.
 */
export type ListSortMode = 'entity' | 'raw';

export interface ListSortOptions<F extends string> {
  /** What the caller asked for. `null`/`undefined` falls back to `defaultOrder`. */
  sort?: ListSort<F> | null;
  /**
   * Whitelist: sort field → ORDER BY expression. A `Record` over the whole
   * enum, so adding an enum member without mapping it does not compile.
   */
  fields: Readonly<Record<F, string>>;
  /** Used when `sort` is absent. One criterion or several, in order. */
  defaultOrder: ListSort<F> | readonly ListSort<F>[];
  /**
   * A unique expression (normally the primary key) appended last, ascending,
   * so rows that tie on every criterion still come back in one fixed order —
   * without it `LIMIT`/`OFFSET` pages can repeat or skip rows.
   *
   * A list without a single-column key (an aggregate, whose row is identified
   * by its whole group key) passes the key's columns in order; together they
   * must be unique.
   */
  tiebreaker: string | readonly string[];
  /** Defaults to `entity`. */
  mode?: ListSortMode;
}

export interface ListSortClause {
  expression: string;
  order: SortOrder;
  nulls?: 'NULLS FIRST' | 'NULLS LAST';
}

/**
 * NULLs sort last in **both** directions.
 *
 * PostgreSQL's own default flips with the direction (NULLS LAST for ASC, NULLS
 * FIRST for DESC), so a column with gaps would open every descending page with
 * its empty rows. A missing value is "no value", not "the largest value": it
 * belongs at the end whichever way the user sorts.
 */
export const LIST_SORT_NULLS = 'NULLS LAST' as const;

const ENTITY_PATH = /^([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_.]*)$/;

const isSortOrder = (value: unknown): value is SortOrder =>
  value === SortOrder.ASC || value === SortOrder.DESC;

/**
 * The ORDER BY clauses `applyListSort` would apply, without a query builder.
 * Pure — this is what the unit tests pin down.
 *
 * Throws on a field outside the whitelist or an unknown direction: the GraphQL
 * enums already reject both, so reaching here with one means a host called the
 * service directly with a bad value, and falling back to the default order would
 * hand it a plausible-looking wrong answer.
 */
export function resolveListSort<F extends string>(
  options: Omit<ListSortOptions<F>, 'mode'>,
): ListSortClause[] {
  const { sort, fields, defaultOrder, tiebreaker } = options;
  const requested: readonly ListSort<F>[] = sort
    ? [sort]
    : Array.isArray(defaultOrder)
      ? (defaultOrder as readonly ListSort<F>[])
      : [defaultOrder as ListSort<F>];

  const clauses = requested.map(({ field, order }): ListSortClause => {
    if (!Object.prototype.hasOwnProperty.call(fields, field)) {
      throw new Error(`Unknown sort field "${String(field)}"`);
    }

    if (!isSortOrder(order)) {
      throw new Error(`Unknown sort order "${String(order)}"`);
    }

    return { expression: fields[field], order, nulls: LIST_SORT_NULLS };
  });

  const tiebreakers: readonly string[] =
    typeof tiebreaker === 'string' ? [tiebreaker] : tiebreaker;

  // TypeORM keys ORDER BY by expression, so appending a tiebreaker column that
  // is already a criterion would overwrite that criterion's direction.
  return [
    ...clauses,
    ...tiebreakers
      .filter((column) =>
        clauses.every(({ expression }) => expression !== column),
      )
      .map((expression) => ({ expression, order: SortOrder.ASC })),
  ];
}

function assertEntityOrderPath<E extends ObjectLiteral>(
  qb: SelectQueryBuilder<E>,
  expression: string,
): void {
  const match = ENTITY_PATH.exec(expression);

  if (!match) {
    throw new Error(
      `Sort expression "${expression}" must be "alias.propertyPath" in entity mode; use mode 'raw' for SQL expressions`,
    );
  }

  const [, aliasName, propertyPath] = match;
  const alias = qb.expressionMap.aliases.find(({ name }) => name === aliasName);

  if (!alias?.hasMetadata) {
    throw new Error(
      `Sort expression "${expression}": alias "${aliasName}" is not an entity alias of this query — join it (by entity class) before applyListSort`,
    );
  }

  if (!alias.metadata.findColumnWithPropertyPath(propertyPath)) {
    throw new Error(
      `Sort expression "${expression}": "${propertyPath}" is not a column of ${alias.metadata.name}`,
    );
  }

  const isMainAlias = qb.expressionMap.mainAlias?.name === aliasName;
  const isSelected = qb.expressionMap.selects.some(
    ({ selection }) => selection === aliasName || selection === expression,
  );

  if (!isMainAlias && !isSelected) {
    throw new Error(
      `Sort expression "${expression}": joined alias "${aliasName}" must be selected (addSelect('${expression}')) or the paginated DISTINCT subquery cannot order by it`,
    );
  }
}

/**
 * Replace the query's ORDER BY with the requested sort (or `defaultOrder`),
 * then the tiebreaker. Call it after every join the sort expressions need.
 *
 * ```ts
 * applyListSort(qb, {
 *   sort: options.sort,
 *   fields: { [MaterialSortField.KEY]: 'material.key', ... },
 *   defaultOrder: { field: MaterialSortField.CREATED_AT, order: SortOrder.DESC },
 *   tiebreaker: 'material.id',
 * });
 * ```
 */
export function applyListSort<E extends ObjectLiteral, F extends string>(
  qb: SelectQueryBuilder<E>,
  options: ListSortOptions<F>,
): SelectQueryBuilder<E> {
  const clauses = resolveListSort(options);

  if ((options.mode ?? 'entity') === 'entity') {
    clauses.forEach(({ expression }) => assertEntityOrderPath(qb, expression));
  }

  qb.orderBy();

  clauses.forEach(({ expression, order, nulls }) => {
    qb.addOrderBy(expression, order, nulls);
  });

  return qb;
}
