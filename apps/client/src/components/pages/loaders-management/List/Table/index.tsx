import { useMemo } from 'react';
import dayjs from 'dayjs';
import { TableColumn, Badge } from '@mezzanine-ui/react';
import { useQuery } from '@apollo/client/react';
import TableWrapper from '../../../../TableWrapper';
import Table from '../../../../TableWrapper/Table';
import {
  useTablePageState,
  useTablePageTotal,
} from '../../../../../hooks/useTablePagination';
import {
  LoadersDocument,
  LoaderFragment,
} from '../../../../../graphql/generated/.graphql';
// import { FilterValues } from '../typing';

function LoadersManagementTable() {
  const { page, setPage, limit, setLimit, offset } = useTablePageState();

  const { data, loading } = useQuery(LoadersDocument, {
    variables: {
      limit,
      offset,
    },
    fetchPolicy: 'cache-and-network',
  });

  const { pageTotal } = useTablePageTotal({
    page,
    total: data?.loaders.total,
    setPage,
    filterValues: [],
  });

  const dataSource = useMemo(
    (): LoaderFragment[] => data?.loaders.items ?? [],
    [data?.loaders.items],
  );

  const columns: TableColumn<LoaderFragment>[] = [
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
      key: 'length',
      title: '長度',
      width: 80,
      align: 'end',
      render: (source) => source.length,
    },
    {
      key: 'width',
      title: '寬度',
      width: 80,
      align: 'end',
      render: (source) => source.width,
    },
    {
      key: 'height',
      title: '高度',
      width: 80,
      align: 'end',
      render: (source) => source.height,
    },
    {
      key: 'sizeUnit',
      title: '尺寸單位',
      width: 80,
      align: 'center',
      render: (source) => source.sizeUnit,
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
  ];

  return (
    <TableWrapper
      title="載具項目"
      createText="新增載具"
      onCreate={() => {
        console.log('新增載具');
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

export default LoadersManagementTable;
