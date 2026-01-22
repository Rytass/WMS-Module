import { useMemo, useState } from 'react';
import { TableColumn } from '@mezzanine-ui/react';
import { useQuery } from '@apollo/client/react';
import TableWrapper from '../../../TableWrapper';
import Table from '../../../TableWrapper/Table';
import {
  useTablePageState,
  useTablePageTotal,
} from '../../../../hooks/useTablePagination';
import MaterialsManagementForm from '../Form';
import {
  MaterialsDocument,
  SimpleMaterialFragment,
} from '../../../../graphql/generated/.graphql';

function MaterialsManagementTable() {
  const [createModalOpened, setCreateModalOpened] = useState<boolean>(false);
  const { page, setPage, limit, setLimit, offset } = useTablePageState();

  const { data, loading } = useQuery(MaterialsDocument, {
    variables: {
      offset,
      limit,
    },
    fetchPolicy: 'cache-and-network',
  });

  const { pageTotal } = useTablePageTotal({
    page,
    total: data?.materials.total,
    setPage,
    filterValues: [],
  });

  const dataSource = useMemo(
    (): SimpleMaterialFragment[] => data?.materials.items ?? [],
    [data?.materials.items],
  );

  const columns: TableColumn<SimpleMaterialFragment>[] = [
    {
      key: 'description',
      title: '物料說明',
      render: (source) => source.description,
    },
  ];

  return (
    <>
      <TableWrapper
        title="類別項目"
        createText="新增料號"
        onCreate={() => {
          setCreateModalOpened(true);
        }}
      >
        <Table<SimpleMaterialFragment>
          columns={columns}
          dataSource={dataSource}
          loading={loading}
          pagination={{
            current: page,
            onChange: (page) => setPage(page),
            total: pageTotal,
            pageSize: limit,
            onChangePageSize: (size) => setLimit(size),
          }}
        />
      </TableWrapper>

      <MaterialsManagementForm
        title="新增料號"
        onSubmit={async (values) => {
          console.log('values', values);
        }}
        submitText="新增"
        closeModal={() => {
          setCreateModalOpened(false);
        }}
        open={createModalOpened}
      />
    </>
  );
}

export default MaterialsManagementTable;
