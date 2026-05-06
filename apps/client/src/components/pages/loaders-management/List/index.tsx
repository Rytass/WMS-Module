import { useState } from 'react';
import LoadersManagementListTable from './Table';
import FilterWrapper from '../../../FilterWrapper';
import { FilterType } from '../../../FilterWrapper/typing';
import LoaderTypesField from '../../../fields/LoaderTypesField';
import LoadersField from '../../../fields/LoadersField';
import YesNoField from '../../../fields/YesNoField';
import { FilterValues } from './typing';

function LoadersManagementList() {
  const [currentFilter, setCurrentFilter] = useState<FilterValues>();

  console.log('currentFilter', currentFilter);

  return (
    <>
      <FilterWrapper<FilterValues>
        defaultValues={{
          loaderType: null,
          location: null,
          loader: null,
          description: '',
        }}
        baseFilters={{
          filters: [
            <LoaderTypesField name="loaderType" selectValueMode />,
            FilterType.location,
            <LoadersField name="loader" label="載具編碼" selectValueMode />,
            <YesNoField
              name="status"
              label="狀態"
              placeholder="狀態"
              customizeOptions={{
                yesName: '啟用中',
                noName: '已停用',
              }}
            />,
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
