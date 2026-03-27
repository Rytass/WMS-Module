import { ReactNode } from 'react';
import { InputField } from '../fields/InputField';
import { DateField } from '../fields/DateField';
import MaterialsField from '../fields/MaterialsField';
import BatchesField from '../fields/BatchesField';
import LocationsField from '../fields/LocationsField';
import LoadersField from '../fields/LoadersField';
import { FilterType } from './typing';

export function renderFilter(filter: FilterType | ReactNode) {
  if (typeof filter !== 'string') {
    return filter;
  }

  switch (filter) {
    case FilterType.createdAt:
      return (
        <DateField
          key={filter}
          name={filter}
          label="建立日期"
          placeholder="建立日期"
        />
      );

    case FilterType.description:
      return (
        <InputField
          key={filter}
          name={filter}
          label="備註"
          placeholder="輸入備註"
        />
      );

    case FilterType.materialDescription:
      return (
        <InputField
          key={filter}
          name={filter}
          label="物料說明"
          placeholder="輸入物料說明"
        />
      );

    case FilterType.material:
      return <MaterialsField key={filter} name={filter} selectValueMode />;

    case FilterType.batch:
      return <BatchesField key={filter} name={filter} selectValueMode />;

    case FilterType.location:
      return <LocationsField key={filter} name={filter} selectValueMode />;

    case FilterType.loader:
      return <LoadersField key={filter} name={filter} selectValueMode />;

    default:
      return null;
  }
}
