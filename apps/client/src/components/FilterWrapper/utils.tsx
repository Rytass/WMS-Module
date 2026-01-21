import { InputField } from '../fields/InputField';
import { DateField } from '../fields/DateField';
import { SingleAutoCompleteField } from '../fields/SingleAutoCompleteField';
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

    case FilterType.materials:
      return (
        <SingleAutoCompleteField
          key={filterType}
          name={FilterType.materials}
          label="料號"
          placeholder="輸入料號"
          options={[
            { id: '1234', name: '1234' },
            { id: '2234', name: '2234' },
            { id: '3234', name: '3234' },
          ]}
        />
      );

    default:
      return null;
  }
}
