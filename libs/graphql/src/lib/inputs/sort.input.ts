import { Field, InputType, registerEnumType } from '@nestjs/graphql';
import { ListSort, SortOrder } from '@rytass/wms-module-core';

registerEnumType(SortOrder, {
  name: 'SortOrder',
  description: 'Direction of a list sort. NULLs always sort last.',
});

/**
 * Base for a list's `<List>SortInput { field, order }`.
 *
 * Every sortable list gets its own field enum (registered with
 * `registerEnumType` as `<List>SortField`) and its own input class extending
 * this, so the schema says exactly which columns each list can sort by:
 *
 * ```ts
 * registerEnumType(MaterialSortField, { name: 'MaterialSortField' });
 *
 * @InputType()
 * export class MaterialSortInput extends SortInput(MaterialSortField) {}
 * ```
 *
 * The query then takes it as an optional `sort` argument; omitted, the list
 * uses its service's default order.
 */
export function SortInput<F extends string>(
  fieldEnum: Record<string, F>,
): abstract new () => ListSort<F> {
  @InputType({ isAbstract: true })
  abstract class SortInputClass implements ListSort<F> {
    @Field(() => fieldEnum)
    field!: F;

    @Field(() => SortOrder)
    order!: SortOrder;
  }

  return SortInputClass;
}
