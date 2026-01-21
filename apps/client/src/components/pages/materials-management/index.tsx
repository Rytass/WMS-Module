import PageWrapper from '../../PageWrapper';
import FilterWrapper from '../../FilterWrapper';
import { FilterType } from '../../FilterWrapper/typing';
import MaterialsManagementTable from './Table';
import { FilterValues } from './typing';

function MaterialsManagement() {
  return (
    <PageWrapper title="料號管理">
      <FilterWrapper<FilterValues>
        defaultValues={{
          description: '',
        }}
        baseFilters={{
          filters: [FilterType.description],
          gridTemplateColumns: '1fr',
        }}
        onSubmit={(values) => {
          console.log('values', values);
        }}
      />
      <MaterialsManagementTable />
    </PageWrapper>
  );
}

export default MaterialsManagement;
