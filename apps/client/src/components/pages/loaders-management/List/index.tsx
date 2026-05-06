import { useState } from 'react';
import LoadersManagementListTable from './Table';
import FilterWrapper from '../../../FilterWrapper';
import { FilterType } from '../../../FilterWrapper/typing';
import { FilterValues } from './typing';

function LoadersManagementList() {
  const [currentFilter, setCurrentFilter] = useState<FilterValues>();

  return (
    <>
      <FilterWrapper<FilterValues>
        defaultValues={{ location: null, description: '' }}
        baseFilters={{
          filters: [
            FilterType.location,
            FilterType.createdAt,
            FilterType.description,
          ],
          gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr',
        }}
        onSubmit={(values) => {
          setCurrentFilter(values);
        }}
      />
      <LoadersManagementListTable />
    </>
  );
}

export default LoadersManagementList;
