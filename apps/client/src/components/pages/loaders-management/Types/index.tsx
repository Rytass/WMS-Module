import { useState } from 'react';
import LoadersManagementTypesTable from './Table';
import FilterWrapper from '../../../FilterWrapper';
import { FilterType } from '../../../FilterWrapper/typing';
import LoaderTypesField from '../../../fields/LoaderTypesField';
import InputField from '../../../fields/InputField';
import SingleAutoCompleteByIdField from '../../../fields/SingleAutoCompleteByIdField';
import { YesOrNo } from '../../../../utils/share';
import { FilterValues } from './typing';

function LoadersManagementTypes() {
  const [currentFilter, setCurrentFilter] = useState<FilterValues>();

  console.log('currentFilter', currentFilter);

  return (
    <>
      <FilterWrapper<FilterValues>
        defaultValues={{
          loaderType: null,
          description: '',
          status: '',
        }}
        baseFilters={{
          filters: [
            <LoaderTypesField
              name="loaderType"
              label="類型代碼"
              selectValueMode
              useKeyToName
            />,
            <InputField
              name="description"
              label="類型說明"
              placeholder="輸入類型說明"
            />,
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
