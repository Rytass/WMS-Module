import {
  Dispatch,
  SetStateAction,
  useCallback,
  useState,
  useMemo,
  useEffect,
} from 'react';
import { flatten, compact, uniq } from 'lodash';
import {
  Typography,
  TableColumn,
  Table as MznTable,
  useTableRowSelection,
  Button,
  cx,
} from '@mezzanine-ui/react';
import { CaretDownIcon } from '@mezzanine-ui/icons';
import Table from '../../../TableWrapper/Table';
import { AggregatedStockFragment } from '../../../../graphql/generated/.graphql';
import { useInventoryActions } from '../../../inventoryActions/useInventoryActions';
import { useQueryStocksGrouped } from '../useApi';
import { FilterValues } from '../typing';
import classes from './group-table.module.scss';
import { FilterType } from '../../../FilterWrapper/typing';

type DataType = AggregatedStockFragment & {
  aggregatedStock?: AggregatedStockFragment[];
  filteredAggregatedStock?: AggregatedStockFragment[];
};

interface InventoryGroupTableProps {
  currentFilter?: FilterValues;
  setTargetStocks: Dispatch<SetStateAction<AggregatedStockFragment[]>>;
  needClearSelectedRows: boolean;
  setNeedClearSelectedRows: Dispatch<SetStateAction<boolean>>;
}

function InventoryGroupTable({
  currentFilter,
  setTargetStocks,
  needClearSelectedRows,
  setNeedClearSelectedRows,
}: InventoryGroupTableProps) {
  const {
    parentSelectedKeys,
    parentOnChange,
    parentGetCheckboxProps,
    getChildSelectedRowKeys,
    getChildOnChange,
  } = useTableRowSelection<DataType>({
    getSubData: (record) => record.filteredAggregatedStock,
  });

  const { targetInventoryIds } = useInventoryActions();

  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);
  const [dataSignature, setDataSignature] = useState<{
    [id: string]: AggregatedStockFragment;
  }>({});

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
    useQueryStocksGrouped(currentFilter);

  const dataSource = useMemo(
    (): DataType[] =>
      (data?.stocksGroupedByMaterial.items ?? []).map((item) => ({
        ...item.aggregatedStock[0],
        key: item.key,
        id: item.id,
        aggregatedStock: item.aggregatedStock,
        filteredAggregatedStock: item.aggregatedStock.filter(
          (stock) =>
            stock.batch.key.includes(
              currentFilter?.[FilterType.batch] ||
                currentFilter?.['batch-search'] ||
                '',
            ) &&
            stock.location.key.includes(
              currentFilter?.[FilterType.location] ||
                currentFilter?.['location-search'] ||
                '',
            ) &&
            stock.loader.serialId.includes(
              currentFilter?.[FilterType.loader] ||
                currentFilter?.['loader-search'] ||
                '',
            ),
        ),
      })),
    [data?.stocksGroupedByMaterial.items, currentFilter],
  );

  useEffect(() => {
    if (needClearSelectedRows) {
      parentOnChange([], null, []);
      setNeedClearSelectedRows(false);
    }
  }, [parentOnChange, needClearSelectedRows, setNeedClearSelectedRows]);

  useEffect(() => {
    const signature = flatten(dataSource.map((d) => d.aggregatedStock)).reduce(
      (prev, curr) => ({
        ...prev,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        [curr!.id]: curr,
      }),
      {},
    );

    setDataSignature((s) => ({ ...s, ...signature }));
  }, [dataSource]);

  useEffect(() => {
    setTargetStocks(
      compact(
        flatten(
          parentSelectedKeys.map((k) => {
            const item = dataSource.find((d) => d.key === k);

            if (item) {
              return getChildSelectedRowKeys(item);
            }

            return null;
          }),
        ).map((key) => (key ? dataSignature[key] : null)),
      ),
    );
  }, [
    dataSignature,
    dataSource,
    getChildSelectedRowKeys,
    parentSelectedKeys,
    setTargetStocks,
  ]);

  const baseColumns: TableColumn<DataType>[] = [
    {
      key: 'status',
      title: '狀態',
      width: 100,
      render: (source) => source.status,
    },
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
      render: (source) => {
        const keys = uniq(source.aggregatedStock?.map((s) => s.batch.key));

        if (keys.length > 1) {
          return (
            <div className={classes.columnWithExpandButton}>
              <Typography variant="body" ellipsis>
                {keys.join(',')}
              </Typography>
              {renderExpandButton(source)}
            </div>
          );
        }

        return keys.join(',');
      },
    },
    {
      key: 'locationKey',
      title: '儲存位置',
      width: 140,
      render: (source) => {
        const keys = uniq(source.aggregatedStock?.map((s) => s.location.key));

        if (keys.length > 1) {
          return (
            <div className={classes.columnWithExpandButton}>
              <Typography variant="body" ellipsis>
                {keys.join(',')}
              </Typography>
              {renderExpandButton(source)}
            </div>
          );
        }

        return keys.join(',');
      },
    },
    {
      key: 'loaderSerialId',
      title: '載具',
      width: 100,
      render: (source) => {
        const keys = uniq(
          source.aggregatedStock?.map((s) => s.loader.serialId),
        );

        if (keys.length > 1) {
          return (
            <div className={classes.columnWithExpandButton}>
              <Typography variant="body" ellipsis>
                {keys.join(',')}
              </Typography>
              {renderExpandButton(source)}
            </div>
          );
        }

        return keys.join(',');
      },
    },
    {
      key: 'quantity',
      title: '數量',
      width: 100,
      align: 'end',
      render: (source) =>
        source.aggregatedStock?.reduce((prev, curr) => prev + curr.quantity, 0),
    },
    {
      key: 'baseUnit',
      title: '單位',
      width: 100,
      align: 'center',
      render: (source) => source.material?.baseUnit?.key,
    },
  ];

  const subColumns: TableColumn<DataType>[] = [
    {
      key: 'status',
      title: '狀態',
      width: 100,
      render: (source) => source.status,
    },
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
    <Table<DataType>
      columns={baseColumns}
      dataSource={dataSource}
      loading={loading}
      expandable={{
        expandedRowRender: (record) => (
          <MznTable<DataType>
            fullWidth
            columns={subColumns}
            dataSource={record.filteredAggregatedStock || []}
            rowState={(source) =>
              targetInventoryIds.includes(source.id) ? 'added' : undefined
            }
            rowSelection={{
              mode: 'checkbox',
              onChange: getChildOnChange(record),
              selectedRowKeys: getChildSelectedRowKeys(record),
              fixed: true,
            }}
          />
        ),
        rowExpandable: (record) =>
          (record.filteredAggregatedStock?.length ?? 0) >= 2,
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
