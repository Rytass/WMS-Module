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
          materials: '',
          materialDescription: '',
        }}
        baseFilters={{
          filters: [FilterType.materials, FilterType.materialDescription],
          gridTemplateColumns: '1fr 2fr',
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
