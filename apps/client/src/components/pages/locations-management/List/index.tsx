import { useState } from 'react';
import LocationsManagementListTable from './Table';
import FilterWrapper from '../../../FilterWrapper';
import LocationsField from '../../../fields/LocationsField';
import InputField from '../../../fields/InputField';
import { FilterValues } from './typing';

const LocationsManagementList: FC = () => {
  const [currentFilter, setCurrentFilter] = useState<FilterValues>();

  console.log('currentFilter', currentFilter);

  return (
    <>
      <FilterWrapper<FilterValues>
        defaultValues={{
          location: null,
          description: '',
        }}
        baseFilters={{
          filters: [
            <LocationsField
              name="location"
              label="儲存位置 ID"
              selectValueMode
              useMpaButton
            />,
            <InputField
              name="description"
              label="位置說明"
              placeholder="輸入位置說明"
            />,
          ],
          gridTemplateColumns: '200px 1fr',
        }}
        onSubmit={(values) => {
          setCurrentFilter(values);
        }}
      />
      <LocationsManagementListTable />
    </>
  );
};

export default LocationsManagementList;
