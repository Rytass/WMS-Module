import { useState } from 'react';
import LoadersManagementListTable from './Table';
import FilterWrapper from '../../../FilterWrapper';
import { FilterType } from '../../../FilterWrapper/typing';
import LoaderTypesField from '../../../fields/LoaderTypesField';
import LoadersField from '../../../fields/LoadersField';
import SingleAutoCompleteByIdField from '../../../fields/SingleAutoCompleteByIdField';
import { YesOrNo } from '../../../../utils/share';
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
            <SingleAutoCompleteByIdField
              name="status"
              label="狀態"
              placeholder="輸入狀態"
              options={[
                {
                  id: YesOrNo.YES,
                  name: '啟用中',
                },
                {
                  id: YesOrNo.NO,
                  name: '已停用',
                },
              ]}
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
