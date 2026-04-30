import { useState } from 'react';
import LocationsManagementListTable from './Table';
import FilterWrapper from '../../../FilterWrapper';
import InputField from '../../../fields/InputField';
import { FilterValues } from './typing';

const LocationsManagementList: FC = () => {
  const [currentFilter, setCurrentFilter] = useState<FilterValues>();

  return (
    <>
      <FilterWrapper<FilterValues>
        defaultValues={{
          description: '',
        }}
        baseFilters={{
          filters: [
            <InputField
              name="description"
              label="位置說明"
              placeholder="輸入位置說明"
            />,
          ],
          gridTemplateColumns: '1fr',
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
