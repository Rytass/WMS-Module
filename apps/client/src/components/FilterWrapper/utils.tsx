import { InputField } from '../fields/InputField';
import { DateField } from '../fields/DateField';
import MaterialsField from '../fields/MaterialsField';
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

    case FilterType.materialDescription:
      return (
        <InputField
          key={filterType}
          name={FilterType.materialDescription}
          label="物料說明"
          placeholder="輸入物料說明"
        />
      );

    case FilterType.material:
      return <MaterialsField key={filterType} name={FilterType.material} />;

    default:
      return null;
  }
}
