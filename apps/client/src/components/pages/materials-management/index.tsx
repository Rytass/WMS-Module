import { useMemo } from 'react';
import { TableColumn } from '@mezzanine-ui/react';
import { useQuery } from '@apollo/client/react';
import PageWrapper from '../../PageWrapper';
import FilterWrapper from '../../FilterWrapper';
import { FilterType } from '../../FilterWrapper/typing';
import TableWrapper from '../../TableWrapper';
import Table from '../../TableWrapper/Table';
import {
  useTablePageState,
  useTablePageTotal,
} from '../../../hooks/useTablePagination';
import { useMaterialsManagementForm } from './Form';
import {
  MaterialsDocument,
  MaterialFragment,
} from '../../../graphql/generated/.graphql';
import { FilterValues } from './typing';

function MaterialsManagement() {
  const { onCreate } = useMaterialsManagementForm({
    onSubmit: async (values) => {
      console.log('values', values);
    },
  });

  const { page, setPage, limit, setLimit, offset } = useTablePageState();

  const { data } = useQuery(MaterialsDocument, {
    variables: {},
    fetchPolicy: 'cache-and-network',
  });

  const { pageTotal } = useTablePageTotal({
    page,
    total: data?.materials.total,
    setPage,
    filterValues: [],
  });

  const dataSource = useMemo(
    (): MaterialFragment[] => data?.materials.items ?? [],
    [data?.materials.items],
  );

  const columns: TableColumn<MaterialFragment>[] = [
    {
      key: 'description',
      title: '物料說明',
      render: (source) => source.description,
    },
  ];

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
      <TableWrapper title="類別項目" createText="新增料號" onCreate={onCreate}>
        <Table<MaterialFragment>
          columns={columns}
          dataSource={dataSource}
          pagination={{
            current: page,
            onChange: (page) => setPage(page),
            total: pageTotal,
            pageSize: limit,
            onChangePageSize: (size) => setLimit(size),
          }}
        />
      </TableWrapper>
    </PageWrapper>
  );
}

export default MaterialsManagement;
