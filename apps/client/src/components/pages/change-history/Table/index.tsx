import { useMemo } from 'react';
import { TableColumn } from '@mezzanine-ui/react';
import TableWrapper from '../../../TableWrapper';
import Table from '../../../TableWrapper/Table';
import { AggregatedStockFragment } from '../../../../graphql/generated/.graphql';
import { useQueryChangeLogs } from '../useApi';

function ChangeHistoryTable() {
  const { data, loading, pageTotal, page, setPage, limit, setLimit } =
    useQueryChangeLogs();

  const dataSource = useMemo(
    (): AggregatedStockFragment[] => data?.changeLogs.items ?? [],
    [data?.changeLogs.items],
  );

  const columns: TableColumn<AggregatedStockFragment>[] = [
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
      render: (source) => source.location?.key,
    },
  ];

  return (
    <TableWrapper title="異動項目">
      <Table<AggregatedStockFragment>
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
