import { useState } from 'react';
import PageWrapper from '../../PageWrapper';
import FilterWrapper from '../../FilterWrapper';
import { FilterType } from '../../FilterWrapper/typing';
import MaterialsManagementTable from './Table';
import { FilterValues } from './typing';

function MaterialsManagement() {
  const [currentFilter, setCurrentFilter] = useState<FilterValues>();

  return (
    <PageWrapper title="料號管理">
      <FilterWrapper<FilterValues>
        defaultValues={{
          material: null,
          materialDescription: '',
        }}
        baseFilters={{
          filters: [FilterType.material, FilterType.materialDescription],
          gridTemplateColumns: '1fr 2fr',
        }}
        onSubmit={(values) => {
          setCurrentFilter(values);
        }}
      />
      <MaterialsManagementTable currentFilter={currentFilter} />
    </PageWrapper>
  );
}

export default MaterialsManagement;
