import { useState } from 'react';
import LoadersManagementListTable from './Table';
import FilterWrapper from '../../../FilterWrapper';
import { FilterType } from '../../../FilterWrapper/typing';
import LoaderTypesField from '../../../fields/LoaderTypesField';
import LoadersField from '../../../fields/LoadersField';
import { FilterValues } from './typing';

function LoadersManagementList() {
  const [currentFilter, setCurrentFilter] = useState<FilterValues>();

  return (
    <>
      <FilterWrapper<FilterValues>
        defaultValues={{ location: null, description: '' }}
        baseFilters={{
          filters: [
            <LoaderTypesField name="loaderType" selectValueMode />,
            FilterType.location,
            <LoadersField name="loader" label="載具編碼" selectValueMode />,
            <div>狀態</div>,
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
