import { InputField } from '../fields/InputField';
import { DateField } from '../fields/DateField';

export type FilterType = 'createdAt' | 'description';

export function renderFilter(filterType: FilterType) {
  switch (filterType) {
    case 'createdAt':
      return (
        <DateField
          key={filterType}
          name="createdAt"
          label="建立日期"
          placeholder="建立日期"
        />
      );

    case 'description':
      return (
        <InputField
          key={filterType}
          name="description"
          label="備註"
          placeholder="輸入備註"
        />
      );

    default:
      return null;
  }
}
