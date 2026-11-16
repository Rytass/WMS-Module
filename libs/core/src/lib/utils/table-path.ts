import type { DataSource, EntityTarget, ObjectLiteral } from 'typeorm';

/**
 * The table an entity actually ended up in, as TypeORM resolved it — after
 * `withWmsTablePrefix`, and with its schema if it has one. Use it wherever SQL
 * names a table: a literal `stocks` in a query is the wrong table as soon as a
 * prefix is in effect.
 *
 * `tablePathOf` is for TypeORM's own query builder (`.from(...)`), which looks
 * the string up against entity metadata exactly as it did the old literal.
 * `quotedTablePathOf` is for SQL text, each part double-quoted.
 */
export const tablePathOf = (
  dataSource: DataSource,
  target: EntityTarget<ObjectLiteral>,
): string => dataSource.getMetadata(target).tablePath;

export const quotedTablePathOf = (
  dataSource: DataSource,
  target: EntityTarget<ObjectLiteral>,
): string =>
  tablePathOf(dataSource, target)
    .split('.')
    .map((part) => `"${part.replace(/"/g, '""')}"`)
    .join('.');
