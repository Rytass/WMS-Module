import { useMemo } from 'react';
import { useRouter } from 'next/router';
import dayjs from 'dayjs';
import { TableColumn, Badge } from '@mezzanine-ui/react';
import TableWrapper from '../../../../TableWrapper';
import Table from '../../../../TableWrapper/Table';
import Actions from './Actions';
import { LoaderFragment } from '../../../../../graphql/generated/.graphql';
import { useQueryLoaders } from '../../useApi';
import { NextPath } from '../../../../../utils/nextpath';

function LoadersManagementListTable() {
  const { push } = useRouter();
  const { data, loading, pageTotal, page, setPage, limit, setLimit } =
    useQueryLoaders();

  const dataSource = useMemo(
    (): LoaderFragment[] => data?.loaders.items ?? [],
    [data?.loaders.items],
  );

  const columns: TableColumn<LoaderFragment>[] = [
    {
      key: 'actions',
      title: '操作',
      width: 170,
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
      key: 'typeDescription',
      title: '載具類型',
      width: 120,
      render: (source) => source.type?.description,
    },
    {
      key: 'serialId',
      title: '載具編碼',
      width: 100,
      render: (source) => source.serialId,
    },
    {
      key: '儲存位置',
      title: '儲存位置',
      width: 100,
      render: (source) => source.location?.key,
    },
    {
      key: 'length',
      title: '長度',
      width: 80,
      align: 'end',
      render: (source) => source.length || '-',
    },
    {
      key: 'width',
      title: '寬度',
      width: 80,
      align: 'end',
      render: (source) => source.width || '-',
    },
    {
      key: 'height',
      title: '高度',
      width: 80,
      align: 'end',
      render: (source) => source.height || '-',
    },
    {
      key: 'sizeUnit',
      title: '尺寸單位',
      width: 80,
      align: 'center',
      render: (source) => source.sizeUnit || '-',
    },
    {
      key: 'volume',
      title: '容積',
      width: 80,
      align: 'end',
      render: (source) => source.volume || '-',
    },
    {
      key: 'volumeUnit',
      title: '容積單位',
      width: 80,
      align: 'center',
      render: (source) => source.volumeUnit || '-',
    },
    {
      key: 'createdAt',
      title: '建立日期',
      width: 120,
      render: (source) => dayjs(source.createdAt).format('YYYY-MM-DD'),
    },

    {
      key: 'note',
      title: '備註',
      width: 120,
      render: (source) => source.note || '-',
    },
  ];

  return (
    <TableWrapper
      title="載具項目"
      createText="新增載具"
      onCreate={() => {
        push(NextPath.LOADERSMANAGEMENT_CREATE);
      }}
    >
      <Table<LoaderFragment>
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
  );
}

export default LoadersManagementListTable;
