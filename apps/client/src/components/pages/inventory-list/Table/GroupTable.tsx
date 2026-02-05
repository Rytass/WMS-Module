import { useCallback, useState, useMemo } from 'react';
import {
  TableDataSourceWithKey,
  TableColumn,
  Table as MznTable,
  useTableRowSelection,
  Typography,
  Button,
  cx,
} from '@mezzanine-ui/react';
import { CaretDownIcon } from '@mezzanine-ui/icons';
import Table from '../../../TableWrapper/Table';
import {
  useTablePageState,
  useTablePageTotal,
} from '../../../../hooks/useTablePagination';
import {
  MaterialWithAggregatedStockFragment,
  AggregatedStockFragment,
} from '../../../../graphql/generated/.graphql';
import { useQueryStocksGrouped } from '../useApi';
import classes from './group-table.module.scss';

type DataType = AggregatedStockFragment & {
  aggregatedStock?: AggregatedStockFragment[];
};

function InventoryGroupTable() {
  const {
    parentSelectedKeys,
    parentOnChange,
    parentGetCheckboxProps,
    getChildSelectedRowKeys,
    getChildOnChange,
  } = useTableRowSelection<DataType>({
    getSubData: (record) => record.aggregatedStock,
  });

  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);

  const renderExpandButton = useCallback(
    (source: AggregatedStockFragment) => {
      const isExpanded = expandedRowKeys.includes(source.key);

      return (
        <Button
          type="button"
          className={cx(classes.expandButton, {
            [classes.isExpanded]: isExpanded,
          })}
          icon={CaretDownIcon}
          iconType="icon-only"
          size="minor"
          variant="base-tertiary"
          onClick={() => {
            if (isExpanded) {
              setExpandedRowKeys((keys) => {
                const targetIndex = keys.findIndex((k) => k === source.key);

                return [
                  ...keys.slice(0, targetIndex),
                  ...keys.slice(targetIndex + 1),
                ];
              });
            } else {
              setExpandedRowKeys((keys) => [...keys, source.key]);
            }
          }}
        />
      );
    },
    [expandedRowKeys],
  );

  const { data, loading, pageTotal, page, setPage, limit, setLimit } =
    useQueryStocksGrouped();

  const dataSource = useMemo(
    (): DataType[] =>
      (data?.stocksGroupedByMaterial.items ?? []).map((item) => ({
        ...item.aggregatedStock[0],
        aggregatedStock: item.aggregatedStock,
      })),
    [data?.stocksGroupedByMaterial.items],
  );

  const baseColumns: TableColumn<DataType>[] = [
    {
      key: 'materialKey',
      title: '料號',
      width: 140,
      render: (source) => source.material?.key,
    },
  ];

  const subColumns: TableColumn<DataType>[] = [
    {
      key: 'materialKey',
      title: '料號',
      width: 140,
      render: (source) => source.material?.key,
    },
  ];

  console.log(
    'selectedRowKeys',
    parentSelectedKeys,
    parentSelectedKeys.map((k) => {
      const item = dataSource.find((d) => d.key === k);

      if (item) {
        return getChildSelectedRowKeys(item);
      }

      return null;
    }),
  );

  return (
    <Table<DataType>
      columns={baseColumns}
      dataSource={dataSource}
      loading={loading}
      expandable={{
        expandedRowRender: (record) => (
          <MznTable<DataType>
            fullWidth
            columns={subColumns}
            dataSource={record.aggregatedStock || []}
            rowSelection={{
              mode: 'checkbox',
              onChange: getChildOnChange(record),
              selectedRowKeys: getChildSelectedRowKeys(record),
              fixed: true,
            }}
          />
        ),
        rowExpandable: (record) => !!record.aggregatedStock?.length,
        onExpandedRowsChange: (keys) => {
          setExpandedRowKeys(keys);
        },
        expandedRowKeys,
      }}
      rowSelection={{
        mode: 'checkbox',
        onChange: parentOnChange,
        selectedRowKeys: parentSelectedKeys,
        getCheckboxProps: parentGetCheckboxProps,
        preserveSelectedRowKeys: true,
        fixed: true,
      }}
      pagination={{
        current: page,
        onChange: (page) => setPage(page),
        total: pageTotal,
        pageSize: limit,
        onChangePageSize: (size) => setLimit(size),
      }}
    />
  );
}

export default InventoryGroupTable;
