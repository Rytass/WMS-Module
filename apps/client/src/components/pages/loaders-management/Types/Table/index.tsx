import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { TableColumn, Badge } from '@mezzanine-ui/react';
import TableWrapper from '../../../../TableWrapper';
import Table from '../../../../TableWrapper/Table';
import Actions from './Actions';
import { LoaderTypeFragment } from '../../../../../graphql/generated/.graphql';
import LoaderTypeForm from '../Form';
import { useQueryLoaderTypes } from '../../useApi';

function LoadersManagementTypesTable() {
  const [createModalOpened, setCreateModalOpened] = useState<boolean>(false);

  const { data, loading, pageTotal, page, setPage, limit, setLimit } =
    useQueryLoaderTypes();

  const dataSource = useMemo(
    (): LoaderTypeFragment[] => data?.loaderTypes.items ?? [],
    [data?.loaderTypes.items],
  );

  const columns: TableColumn<LoaderTypeFragment>[] = [
    {
      key: 'actions',
      title: '操作',
      align: 'center',
      width: 74,
      render: (source) => <Actions source={source} />,
    },
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
      key: 'serial',
      title: '類型代碼',
      width: 236,
      render: (source) => source.serial,
    },
    {
      key: 'description',
      title: '類型說明',
      width: 140,
      render: (source) => source.description,
    },
    {
      key: 'referencedQuantity',
      title: '現有數量',
      align: 'end',
      width: 140,
      render: (source) => source.referencedQuantity,
    },
    {
      key: 'createdAt',
      title: '建立日期',
      render: (source) => dayjs(source.createdAt).format('YYYY-MM-DD'),
    },
  ];

  return (
    <>
      <TableWrapper
        title="類別項目"
        createText="新增類別"
        onCreate={() => {
          setCreateModalOpened(true);
        }}
      >
        <Table<LoaderTypeFragment>
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
      <LoaderTypeForm
        title="新增載具類型"
        mode="create"
        defaultValues={{
          description: '',
          serial: '',
          isActive: true,
        }}
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

export default LoadersManagementTypesTable;
