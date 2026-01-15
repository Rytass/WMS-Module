import { InputField } from '../fields/InputField';
import { DateField } from '../fields/DateField';

export type FilterType = 'createdAt' | 'description';

export function renderFilter(filterType: FilterType) {
  switch (filterType) {
    case 'createdAt':
      return (
        <DateField name="createdAt" label="建立日期" placeholder="建立日期" />
      );

    case 'description':
      return (
        <InputField name="description" label="備註" placeholder="輸入備註" />
      );

    default:
      return null;
  }
}
