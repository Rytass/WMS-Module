import {
  Dispatch,
  SetStateAction,
  useCallback,
  useState,
  useMemo,
  useEffect,
} from 'react';
import { flatten, compact, uniq, isNull } from 'lodash';
import {
  Typography,
  TableColumn,
  Table as MznTable,
  useTableRowSelection,
  Button,
  Icon,
  cx,
} from '@mezzanine-ui/react';
import {
  CaretDownIcon,
  LockIcon,
  DangerousOutlineIcon,
} from '@mezzanine-ui/icons';
import { WaitIcon, TransferIcon } from '../../../../icons';
import Table from '../../../TableWrapper/Table';
import {
  StockStatus,
  AggregatedStockFragment,
} from '../../../../graphql/generated/.graphql';
import { useInventoryActions } from '../../../inventoryActions/useInventoryActions';
import { aggregatedStockColumns, formatKeyName } from '../../../../utils/share';
import { stockStatusName } from '../../../inventoryActions/utils';
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
              currentFilter?.[FilterType.batch]?.name ||
                currentFilter?.['batch-search'] ||
                '',
            ) &&
            stock.location.key.includes(
              currentFilter?.[FilterType.location]?.name ||
                currentFilter?.['location-search'] ||
                '',
            ) &&
            stock.loader.serialId.includes(
              currentFilter?.[FilterType.loader]?.name ||
                currentFilter?.['loader-search'] ||
                '',
            ), // 之後應該要加上供應商、客戶、銷售訂單編號、銷售訂單項次
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
      render: (source) =>
        uniq(
          source.aggregatedStock?.map((s) => stockStatusName(s.status)),
        ).join(','),
    },
    {
      key: 'inspectionResult',
      title: '檢驗',
      width: 48,
      align: 'center',
      render: (source) =>
        source.aggregatedStock?.some((s) => isNull(s.inspectionResult)) ? (
          <Icon icon={WaitIcon} color="neutral" size={16} />
        ) : source.aggregatedStock?.some((s) => !s.inspectionResult) ? (
          <Icon icon={DangerousOutlineIcon} color="neutral" size={16} />
        ) : null,
    },
    {
      key: 'held',
      title: '凍結',
      width: 48,
      align: 'center',
      render: (source) =>
        source.aggregatedStock?.some((s) => s.held) ? (
          <Icon icon={LockIcon} color="neutral" size={16} />
        ) : null,
    },
    {
      key: 'inTransfer',
      title: '調撥',
      width: 48,
      align: 'center',
      render: (source) =>
        source.aggregatedStock?.some(
          (s) => s.status === StockStatus.IN_TRANSFER,
        ) ? (
          <Icon icon={TransferIcon} color="neutral" size={16} />
        ) : null,
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
        const keys = uniq(
          source.aggregatedStock?.map((s) => formatKeyName(s.location.key)),
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
      key: 'loaderSerialId',
      title: '載具',
      width: 100,
      render: (source) => {
        const keys = uniq(
          source.aggregatedStock?.map((s) => formatKeyName(s.loader.serialId)),
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
    {
      key: 'vendorId',
      title: '供應商',
      width: 140,
      render: (source) => {
        const keys = uniq(
          source.aggregatedStock?.map((s) => s.vendorId || '-'),
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
      key: 'customerId',
      title: '客戶',
      width: 140,
      render: (source) => {
        const keys = uniq(
          source.aggregatedStock?.map((s) => s.customerId || '-'),
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
      key: 'saleId',
      title: '銷售訂單號碼',
      width: 140,
      render: (source) => {
        const keys = uniq(source.aggregatedStock?.map((s) => s.saleId || '-'));

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
      key: 'saleSerialId',
      title: '銷售訂單項次',
      width: 140,
      render: (source) => {
        const keys = uniq(
          source.aggregatedStock?.map((s) => s.saleSerialId || '-'),
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
  ];

  const subColumns: TableColumn<DataType>[] = aggregatedStockColumns;

  return (
    <Table<DataType>
      tableKey="InventoryGroupTable"
      columns={baseColumns}
      dataSource={dataSource}
      rowState={(source) =>
        source.aggregatedStock?.length === 1 &&
        targetInventoryIds.includes(source.aggregatedStock[0].id)
          ? 'added'
          : undefined
      }
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
        rowExpandable: (record) => (record.aggregatedStock?.length ?? 0) >= 2,
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
