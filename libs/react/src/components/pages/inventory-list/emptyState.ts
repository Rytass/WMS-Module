import type { EmptyProps } from '@mezzanine-ui/react';
import { FilterType } from '../../FilterWrapper/typing';
import { FilterValues } from './typing';

/**
 * The stock list's two empty states.
 *
 * The design draws them as separate screens (`A-1.4.2 查詢後沒資料` vs
 * `A-1.4.3 初始沒資料`) because they mean opposite things: one says "narrow it
 * differently", the other says "there is no stock". Collapsing both into
 * 「查無資料」 tells an operator staring at an empty warehouse to go fix their
 * filters.
 */
export function hasAnyFilter(filter?: FilterValues): boolean {
  if (!filter) return false;

  return Boolean(
    filter[FilterType.material] ||
      filter['material-search'] ||
      filter[FilterType.batch] ||
      filter['batch-search'] ||
      filter[FilterType.location] ||
      filter['location-search'] ||
      filter[FilterType.loader] ||
      filter['loader-search'] ||
      filter[FilterType.materialDescription] ||
      filter.vendorId ||
      filter.customerId ||
      filter.saleId ||
      filter.saleSerialId,
  );
}

export function stockEmptyProps(filter?: FilterValues): EmptyProps {
  return hasAnyFilter(filter)
    ? {
        type: 'result',
        title: '查無符合條件的資料',
        description: '請調整篩選條件後再查詢一次。',
      }
    : {
        type: 'initial-data',
        title: '目前沒有庫存資料',
        description: '入庫之後，庫存項目會顯示在這裡。',
      };
}
