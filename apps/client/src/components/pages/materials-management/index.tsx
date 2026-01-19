import { TableDataSourceWithKey, TableColumn } from '@mezzanine-ui/react';
import PageWrapper from '../../PageWrapper';
import FilterWrapper from '../../FilterWrapper';
import { FilterType } from '../../FilterWrapper/typing';
import TableWrapper from '../../TableWrapper';
import Table from '../../TableWrapper/Table';
import {
  useTablePageState,
  useTablePageTotal,
} from '../../../hooks/useTablePagination';
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
    </PageWrapper>
  );
}

export default MaterialsManagement;
