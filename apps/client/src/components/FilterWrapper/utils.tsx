import { InputField } from '../fields/InputField';
import { DateField } from '../fields/DateField';
import { FilterType } from './typing';

export function renderFilter(filterType: FilterType) {
  switch (filterType) {
    case FilterType.createdAt:
      return (
        <DateField
          key={filterType}
          name={FilterType.createdAt}
          label="建立日期"
          placeholder="建立日期"
        />
      );

    case FilterType.description:
      return (
        <InputField
          key={filterType}
          name={FilterType.description}
          label="備註"
          placeholder="輸入備註"
        />
      );

    default:
      return null;
  }
}
