import { useState } from 'react';
import LoadersManagementTypesTable from './Table';
import FilterWrapper from '../../../FilterWrapper';
import { FilterType } from '../../../FilterWrapper/typing';
import { FilterValues } from './typing';

function LoadersManagementTypes() {
  const [currentFilter, setCurrentFilter] = useState<FilterValues>();

  return (
    <>
      <FilterWrapper<FilterValues>
        defaultValues={{}}
        baseFilters={{
          filters: [FilterType.createdAt],
          gridTemplateColumns: '1fr 1fr 1fr 1fr',
        }}
        onSubmit={(values) => {
          setCurrentFilter(values);
        }}
      />
      <LoadersManagementTypesTable />
    </>
  );
}

export default LoadersManagementTypes;
