import { useMemo } from 'react';
import { useWmsRouter } from '../../../../../router/context';
import dayjs from 'dayjs';
import { TableColumn, Badge } from '@mezzanine-ui/react';
import TableWrapper from '../../../../TableWrapper';
import Table from '../../../../TableWrapper/Table';
import Actions from './Actions';
import { LoaderFragment } from '../../../../../graphql/generated/.graphql';
import { useQueryLoaders } from '../../useApi';
import { NextPath } from '../../../../../utils/nextpath';
import { formatKeyName } from '../../../../../utils/share';
import { FilterValues } from '../typing';
import LocationMapPreview from '../../../../map/LocationMapPreview';

interface LoadersManagementListTableProps {
  currentFilter?: FilterValues;
}

function LoadersManagementListTable({
  currentFilter,
}: LoadersManagementListTableProps) {
  const { push } = useWmsRouter();
  const {
    data,
    loading,
    pageTotal,
    page,
    setPage,
    limit,
    setLimit,
    getColumnSortProps,
  } = useQueryLoaders(currentFilter);

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
      ...getColumnSortProps('isActive'),
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
      ...getColumnSortProps('typeDescription'),
      title: '載具類型',
      width: 120,
      render: (source) => source.type?.description,
    },
    {
      key: 'serialId',
      ...getColumnSortProps('serialId'),
      title: '載具編碼',
      width: 100,
      render: (source) => formatKeyName(source.serialId),
    },
    {
      key: 'locationKey',
      ...getColumnSortProps('locationKey'),
      title: '儲存位置',
      width: 100,
      render: (source) => (
        <LocationMapPreview locationKey={source.location?.key} />
      ),
    },
    {
      key: 'length',
      ...getColumnSortProps('length'),
      title: '長度',
      width: 80,
      align: 'end',
      render: (source) => source.length || '-',
    },
    {
      key: 'width',
      ...getColumnSortProps('width'),
      title: '寬度',
      width: 80,
      align: 'end',
      render: (source) => source.width || '-',
    },
    {
      key: 'height',
      ...getColumnSortProps('height'),
      title: '高度',
      width: 80,
      align: 'end',
      render: (source) => source.height || '-',
    },
    {
      key: 'sizeUnit',
      ...getColumnSortProps('sizeUnit'),
      title: '尺寸單位',
      width: 80,
      align: 'center',
      render: (source) => source.sizeUnit || '-',
    },
    {
      key: 'volume',
      ...getColumnSortProps('volume'),
      title: '容積',
      width: 80,
      align: 'end',
      render: (source) => source.volume || '-',
    },
    {
      key: 'volumeUnit',
      ...getColumnSortProps('volumeUnit'),
      title: '容積單位',
      width: 80,
      align: 'center',
      render: (source) => source.volumeUnit || '-',
    },
    {
      key: 'createdAt',
      ...getColumnSortProps('createdAt'),
      title: '建立日期',
      width: 120,
      render: (source) => dayjs(source.createdAt).format('YYYY-MM-DD'),
    },

    {
      key: 'note',
      ...getColumnSortProps('note'),
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
        tableKey="Loaders"
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
