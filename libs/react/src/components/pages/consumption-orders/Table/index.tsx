import { useMemo } from 'react';
import { TableColumn } from '@mezzanine-ui/react';
import TableWrapper from '../../../TableWrapper';
import Table from '../../../TableWrapper/Table';
import { useWmsRouter } from '../../../../router/context';
import { NextPath } from '../../../../utils/nextpath';
import { ConsumptionOrderDetailFragment } from '../../../../graphql/generated/.graphql';
import { formatKeyName } from '../../../../utils/share';
import { useQueryConsumptionOrders } from '../useApi';
import { FilterValues } from '../typing';

interface ConsumptionOrdersTableProps {
  currentFilter?: FilterValues;
}

/**
 * Sum one quantity across every line of an order.
 *
 * `items` is optional here on purpose: while the query is in flight the table
 * renders skeleton rows and still calls every column's `render`, handing it an
 * empty object. Every other table in this package guards with `?.` for the same
 * reason.
 */
function sumBy(
  order: ConsumptionOrderDetailFragment,
  pick: (item: ConsumptionOrderDetailFragment['items'][number]) => number,
): number {
  return (order.items ?? []).reduce(
    (total, item) => total + Number(pick(item)),
    0,
  );
}

function ConsumptionOrdersTable({
  currentFilter,
}: ConsumptionOrdersTableProps) {
  const { push } = useWmsRouter();
  const { data, loading, pageTotal, page, setPage, limit, setLimit } =
    useQueryConsumptionOrders(currentFilter);

  const dataSource = useMemo(
    (): ConsumptionOrderDetailFragment[] => data?.consumptionOrders.items ?? [],
    [data?.consumptionOrders.items],
  );

  const columns: TableColumn<ConsumptionOrderDetailFragment>[] = [
    {
      key: 'key',
      title: '單號',
      width: 160,
      render: (source) => source.key,
    },
    {
      key: 'description',
      title: '說明',
      width: 200,
      render: (source) => source.description ?? '',
    },
    {
      key: 'items',
      title: '項目數',
      width: 90,
      align: 'end',
      render: (source) => source.items?.length ?? 0,
    },
    {
      key: 'locations',
      title: '領用來源',
      width: 160,
      render: (source) =>
        Array.from(
          new Set(
            (source.items ?? []).map((item) =>
              formatKeyName(item.location?.key),
            ),
          ),
        ).join('、'),
    },
    {
      key: 'targetLocations',
      title: '耗用地點',
      width: 160,
      render: (source) =>
        Array.from(
          new Set(
            (source.items ?? []).map((item) =>
              formatKeyName(item.targetLocation?.key),
            ),
          ),
        ).join('、'),
    },
    {
      key: 'issued',
      title: '已領用',
      width: 100,
      align: 'end',
      render: (source) => sumBy(source, (item) => item.issuedQuantity),
    },
    {
      key: 'outstanding',
      title: '在製中',
      width: 100,
      align: 'end',
      render: (source) => sumBy(source, (item) => item.outstandingQuantity),
    },
    {
      key: 'settled',
      title: '已耗用',
      width: 100,
      align: 'end',
      render: (source) => sumBy(source, (item) => item.settledQuantity),
    },
  ];

  return (
    <TableWrapper title="領用單">
      <Table<ConsumptionOrderDetailFragment>
        tableKey="ConsumptionOrder"
        columns={columns}
        dataSource={dataSource}
        loading={loading}
        actions={{
          render: (source) => [
            {
              text: '檢視',
              onClick: () =>
                push(NextPath.CONSUMPTIONORDERS_ID.replace('[id]', source.id)),
            },
          ],
        }}
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

export default ConsumptionOrdersTable;
