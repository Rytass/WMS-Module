import { useMemo } from 'react';
import { TableColumn } from '@mezzanine-ui/react';
import TableWrapper from '../../../TableWrapper';
import Table from '../../../TableWrapper/Table';
import { ChangeLogFragment } from '../../../../graphql/generated/.graphql';
import { changeTypeName, formatKeyName } from '../../../../utils/share';
import { useQueryChangeLogs } from '../useApi';

function ChangeHistoryTable() {
  const { data, loading, pageTotal, page, setPage, limit, setLimit } =
    useQueryChangeLogs();

  const dataSource = useMemo(
    (): ChangeLogFragment[] => data?.changeLogs.items ?? [],
    [data?.changeLogs.items],
  );

  const columns: TableColumn<ChangeLogFragment>[] = [
    {
      key: 'changeType',
      title: '異動行為',
      width: 140,
      render: (source) => changeTypeName(source.changeType),
    },
    {
      key: 'key',
      title: '料號',
      width: 140,
      render: (source) => source.material?.key,
    },
    {
      key: 'description',
      title: '物料說明',
      width: 140,
      render: (source) => source.material?.description,
    },
    {
      key: 'batchKey',
      title: '批號',
      width: 140,
      render: (source) => source.batch?.key,
    },
    {
      key: 'locationKey',
      title: '儲存位置',
      width: 140,
      render: (source) => formatKeyName(source.location?.key),
    },
    {
      key: 'quantity',
      title: '數量',
      width: 100,
      align: 'end',
      render: (source) => source.quantity,
    },
    {
      key: 'baseUnit',
      title: '單位',
      width: 100,
      align: 'center',
      render: (source) => source.material?.baseUnit?.key,
    },
  ];

  return (
    <TableWrapper title="異動項目">
      <Table<ChangeLogFragment>
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

export default ChangeHistoryTable;
