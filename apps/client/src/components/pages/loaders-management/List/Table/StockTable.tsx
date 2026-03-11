import { useMemo } from 'react';
import { TableColumn } from '@mezzanine-ui/react';
import Table from '../../../../TableWrapper/Table';
import { AggregatedStockFragment } from '../../../../../graphql/generated/.graphql';
import { useQueryStocksByLoaderId } from '../../useApi';

interface StockTableProps {
  loaderId: string;
}

const StockTable: FC<StockTableProps> = ({ loaderId }) => {
  const { data, loading, pageTotal, page, setPage, limit, setLimit } =
    useQueryStocksByLoaderId(loaderId);

  const dataSource = useMemo(
    (): AggregatedStockFragment[] => data?.aggregatedStocks.items ?? [],
    [data?.aggregatedStocks.items],
  );

  const columns: TableColumn<AggregatedStockFragment>[] = [
    {
      key: 'materialKey',
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
    {
      key: 'loaderSerialId',
      title: '載具',
      width: 100,
      render: (source) => source.loader?.serialId,
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
  );
};

export default StockTable;
