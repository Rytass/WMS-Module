import { useState } from 'react';
import LoadersManagementTypesTable from './Table';
import FilterWrapper from '../../../FilterWrapper';
import { FilterType } from '../../../FilterWrapper/typing';
import LoaderTypesField from '../../../fields/LoaderTypesField';
import { FilterValues } from './typing';

function LoadersManagementTypes() {
  const [currentFilter, setCurrentFilter] = useState<FilterValues>();

  console.log('currentFilter', currentFilter);

  return (
    <>
      <FilterWrapper<FilterValues>
        defaultValues={{
          loaderType: null,
        }}
        baseFilters={{
          filters: [
            <LoaderTypesField
              name="loaderType"
              label="類型代碼"
              selectValueMode
              useKeyToName
            />,
            FilterType.createdAt,
          ],
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
