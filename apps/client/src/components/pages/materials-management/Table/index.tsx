import { useMemo, useState } from 'react';
import { TableColumn, Badge } from '@mezzanine-ui/react';
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
      key: 'isActive',
      title: '狀態',
      width: 100,
      render: (source) =>
        source.isActive ? (
          <Badge variant="dot-success" text="啟用中" />
        ) : (
          <Badge variant="dot-inactive" text="已停用" />
        ),
    },
    {
      key: 'key',
      title: '料號',
      width: 160,
      render: (source) => source.key,
    },
    {
      key: 'description',
      title: '物料說明',
      width: 120,
      render: (source) => source.description,
    },
    {
      key: 'baseUnit',
      title: '基礎計量單位',
      width: 96,
      align: 'center',
      render: (source) => source.baseUnit,
    },
    {
      key: 'ttt',
      title: '單位轉換',
      render: (source) => '',
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
