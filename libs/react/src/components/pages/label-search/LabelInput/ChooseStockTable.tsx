import { ReactElement, useCallback, useMemo } from 'react';
import {
  Message,
  TableColumn,
  Button,
  Typography,
  Spin,
} from '@mezzanine-ui/react';
import Table from '../../../TableWrapper/Table';
import { AggregatedStockFragment } from '../../../../graphql/generated/.graphql';
import { useModal } from '../../../modal/useModal';
import { stockStatusName } from '../../../inventoryActions/utils';
import {
  useAddInventories,
  useInventoryActions,
} from '../../../inventoryActions/useInventoryActions';
import { useCompactLayout } from '../../../../hooks/useCompactLayout';
import { CHOOSE_STOCK_LIMIT, useQueryStocksByScanCode } from '../useApi';
import classes from './index.module.scss';

interface ChooseStockTableProps {
  scanCode: string;
  onClosed?: VoidFunction;
}

const ChooseStockTable: FC<ChooseStockTableProps> = ({
  scanCode,
  onClosed,
}) => {
  const { closeModal } = useModal();
  const addInventories = useAddInventories();
  const { targetInventoryIds, targetAction } = useInventoryActions();
  const compact = useCompactLayout();

  const { data, loading, total, getColumnSortProps } =
    useQueryStocksByScanCode(scanCode);

  const dataSource = useMemo(
    (): AggregatedStockFragment[] => data?.aggregatedStocks.items ?? [],
    [data?.aggregatedStocks.items],
  );

  const truncatedNote =
    total > dataSource.length && !loading ? (
      <Typography variant="caption" color="text-neutral">
        {`共 ${total} 筆，僅列出前 ${CHOOSE_STOCK_LIMIT} 筆，請改掃更精確的標籤`}
      </Typography>
    ) : null;

  const choose = useCallback(
    (source: AggregatedStockFragment): void => {
      addInventories({
        targetStocks: [source],
        currentAction: targetAction,
        onAddSuccess: () => {
          Message.success(
            `已加入料號：${source.material.key} / 批號：${source.batch.key} / 儲存位置：${source.location.key}`,
          );
          closeModal();
          onClosed?.();
        },
      });
    },
    [addInventories, closeModal, onClosed, targetAction],
  );

  // Picking a row the current action cannot take only ends in an error toast;
  // say so on the row instead.
  const isAdded = (source: AggregatedStockFragment): boolean =>
    targetInventoryIds.includes(source.id);
  const isBlocked = (source: AggregatedStockFragment): boolean =>
    !!targetAction && !targetAction.condition(source);
  const buttonText = (source: AggregatedStockFragment): string =>
    isAdded(source) ? '已加入' : isBlocked(source) ? '不可用' : '選擇';

  const columns: TableColumn<AggregatedStockFragment>[] = [
    {
      key: 'action',
      title: '操作',
      width: 84,
      align: 'center',
      render: (source) => (
        <Button
          type="button"
          size="sub"
          disabled={isAdded(source) || isBlocked(source)}
          onClick={() => choose(source)}
        >
          {buttonText(source)}
        </Button>
      ),
    },
    {
      key: 'materialKey',
      title: '料號',
      width: 180,
      render: (source) => source.material.key,
      ...getColumnSortProps('materialKey'),
    },
    {
      key: 'description',
      title: '品名',
      width: 220,
      render: (source) => source.material.description,
      ...getColumnSortProps('description'),
    },
    {
      key: 'batchKey',
      title: '批號',
      width: 180,
      render: (source) => source.batch.key,
      ...getColumnSortProps('batchKey'),
    },
    {
      key: 'locationKey',
      title: '儲存位置',
      width: 160,
      render: (source) => source.location.key,
      ...getColumnSortProps('locationKey'),
    },
    {
      key: 'status',
      title: '狀態',
      width: 110,
      render: (source) => stockStatusName(source.status),
      ...getColumnSortProps('status'),
    },
    {
      key: 'quantity',
      title: '數量',
      width: 100,
      align: 'end',
      render: (source) => source.quantity,
      ...getColumnSortProps('quantity'),
    },
    {
      key: 'baseUnit',
      title: '單位',
      width: 80,
      align: 'center',
      render: (source) => source.material?.baseUnit?.key,
      ...getColumnSortProps('baseUnit'),
    },
  ];

  if (compact) {
    return (
      <div className={classes.chooseList}>
        {loading && dataSource.length === 0 ? (
          <Spin loading />
        ) : (
          dataSource.map(
            (source): ReactElement => (
              <div key={source.id} className={classes.chooseItem}>
                <div className={classes.chooseItemText}>
                  <Typography
                    variant="body-highlight"
                    color="text-neutral-solid"
                  >
                    {source.batch.key}
                  </Typography>
                  <Typography variant="caption" color="text-neutral">
                    {`料號 ${source.material.key}`}
                  </Typography>
                  {source.material.description && (
                    <Typography variant="caption" color="text-neutral">
                      {`品名 ${source.material.description}`}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text-neutral">
                    {`儲存位置 ${source.location.key}`}
                  </Typography>
                  <Typography variant="caption" color="text-neutral-solid">
                    {`${stockStatusName(source.status)} · ${source.quantity} ${source.material?.baseUnit?.key ?? ''}`}
                  </Typography>
                </div>
                <Button
                  type="button"
                  size="main"
                  variant={
                    isAdded(source) || isBlocked(source)
                      ? 'base-secondary'
                      : 'base-primary'
                  }
                  disabled={isAdded(source) || isBlocked(source)}
                  onClick={() => choose(source)}
                >
                  {buttonText(source)}
                </Button>
              </div>
            ),
          )
        )}
        {truncatedNote}
      </div>
    );
  }

  return (
    <div className={classes.chooseTable}>
      <Table<AggregatedStockFragment>
        tableKey="ChooseStockTable"
        columns={columns}
        dataSource={dataSource}
        rowState={(source) =>
          source && targetInventoryIds.includes(source.id) ? 'added' : undefined
        }
        loading={loading}
        unpaginated
      />
      {truncatedNote}
    </div>
  );
};

export default ChooseStockTable;
