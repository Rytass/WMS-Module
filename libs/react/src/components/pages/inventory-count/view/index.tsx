import { useCallback, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import {
  Button,
  Input,
  Message,
  Select,
  SelectValue,
  TableColumn,
  Toggle,
  Typography,
} from '@mezzanine-ui/react';
import { DownloadIcon, TrashIcon, UploadIcon } from '@mezzanine-ui/icons';
import { useWmsRouter } from '../../../../router/context';
import Loading from '../../../Loading';
import PageWrapper from '../../../PageWrapper';
import SectionWrapper from '../../../SectionWrapper';
import TableWrapper from '../../../TableWrapper';
import Table from '../../../TableWrapper/Table';
import { useDialog } from '../../../dialog/useDialog';
import Status from '../Status';
import AddStockModal from './AddStockModal';
import {
  useInventoryCountMutations,
  useQueryInventoryCountOrder,
} from '../useApi';
import {
  InventoryCountOrderItemFragment,
  InventoryCountStatus,
} from '../../../../graphql/generated/.graphql';
import { BASE_UNIT } from '../../../../utils/share';
import { buildCountSheetCsv, downloadCsv, parseCountSheetCsv } from '../csv';
import classes from './index.module.scss';

/** Counted quantities being edited, keyed by item id. */
type CountDraft = Record<string, { quantity: string; unitId: string | null }>;

function ViewInventoryCount() {
  const { params } = useWmsRouter();
  const id = useMemo(() => (params?.id as string) ?? '', [params?.id]);
  const { openDialog } = useDialog();

  const { data, loading } = useQueryInventoryCountOrder(id);
  const {
    startInventoryCount,
    countInventory,
    resetInventoryCount,
    cancelInventoryCount,
    settleInventoryCount,
    removeInventoryCountItem,
  } = useInventoryCountMutations();

  const [draft, setDraft] = useState<CountDraft>({});
  const [onlyVariance, setOnlyVariance] = useState<boolean>(false);
  const [addModalOpened, setAddModalOpened] = useState<boolean>(false);
  /**
   * Settlement locks the whole page. The design is explicit about this: no
   * pausing, cancelling or navigating away until the adjustment finishes, so a
   * half-applied variance can never be left behind.
   */
  const [settling, setSettling] = useState<boolean>(false);
  const uploadRef = useRef<HTMLInputElement>(null);

  const order = data?.inventoryCountOrder;
  const status = order?.status;
  const isCounting = status === InventoryCountStatus.COUNTING;

  const items = useMemo(
    (): InventoryCountOrderItemFragment[] => order?.items ?? [],
    [order?.items],
  );

  /** The value shown in a row's input: the draft if edited, else the server's. */
  const quantityOf = useCallback(
    (item: InventoryCountOrderItemFragment): string => {
      const edited = draft[item.id];

      if (edited) return edited.quantity;

      return item.countedQuantity === null ? '' : String(item.countedQuantity);
    },
    [draft],
  );

  const unitOf = useCallback(
    (item: InventoryCountOrderItemFragment): string | null =>
      draft[item.id] ? draft[item.id].unitId : (item.unitId ?? null),
    [draft],
  );

  const hasVariance = useCallback(
    (item: InventoryCountOrderItemFragment): boolean => {
      const raw = quantityOf(item);

      if (raw === '') return false;

      return Number(raw) !== Number(item.bookQuantity);
    },
    [quantityOf],
  );

  const dataSource = useMemo(
    () => (onlyVariance ? items.filter(hasVariance) : items),
    [hasVariance, items, onlyVariance],
  );

  const unitOptions = useCallback(
    (item: InventoryCountOrderItemFragment): SelectValue<string>[] => [
      { id: BASE_UNIT, name: item.material?.baseUnit?.key ?? '-' },
      ...(item.material?.materialUnits ?? []).map((unit) => ({
        id: unit.id,
        name: unit.unit,
      })),
    ],
    [],
  );

  const draftEntries = useCallback(
    () =>
      Object.entries(draft).map(([itemId, value]) => ({
        itemId,
        countedQuantity: value.quantity === '' ? null : Number(value.quantity),
        unitId: value.unitId === BASE_UNIT ? null : value.unitId,
      })),
    [draft],
  );

  const saveDraft = useCallback(async () => {
    const entries = draftEntries();

    if (!entries.length) return;

    await countInventory({ variables: { id, items: entries } });
    setDraft({});
  }, [countInventory, draftEntries, id]);

  const onSave = useCallback(async () => {
    await saveDraft();
    Message.success('暫存成功');
  }, [saveDraft]);

  const onStart = useCallback(async () => {
    await startInventoryCount({ variables: { id } });
    Message.success('已開始盤點');
  }, [id, startInventoryCount]);

  const onSettle = useCallback(async () => {
    setSettling(true);

    try {
      // Flush anything still in the inputs first: settling what is on screen is
      // the only behaviour that cannot surprise the operator.
      await saveDraft();
      await settleInventoryCount({ variables: { id } });
      Message.success('盤差執行成功');
    } finally {
      setSettling(false);
    }
  }, [id, saveDraft, settleInventoryCount]);

  const onCancel = useCallback(() => {
    openDialog({
      title: '取消盤點',
      children: '取消後此張盤點單將無法繼續執行，確定要取消嗎？',
      onConfirm: async () => {
        await cancelInventoryCount({ variables: { id } });
        Message.success('已取消盤點');
      },
    });
  }, [cancelInventoryCount, id, openDialog]);

  const onReset = useCallback(() => {
    openDialog({
      title: '清空重填',
      children: '將清除所有已填寫的盤點數量與新增的庫存項目，確定嗎？',
      onConfirm: async () => {
        await resetInventoryCount({ variables: { id } });
        setDraft({});
        Message.success('已清空盤點內容');
      },
    });
  }, [id, openDialog, resetInventoryCount]);

  const onDownload = useCallback(() => {
    if (!order) return;

    downloadCsv(
      `${order.key}_盤點清單.csv`,
      buildCountSheetCsv(order.key, items),
    );
  }, [items, order]);

  const onUpload = useCallback(
    async (file: File) => {
      const { rows, errors } = parseCountSheetCsv(await file.text(), items);

      if (errors.length) {
        // One summary rather than a burst of toasts: the operator needs to see
        // the whole list to decide whether to fix the file or the shelf.
        Message.error(
          `檔案有 ${errors.length} 個問題：\n${errors.slice(0, 10).join('\n')}`,
        );
      }

      if (!rows.length) return;

      setDraft((previous) => ({
        ...previous,
        ...Object.fromEntries(
          rows.map(({ itemId, countedQuantity }) => [
            itemId,
            {
              quantity: String(countedQuantity),
              unitId: previous[itemId]?.unitId ?? null,
            },
          ]),
        ),
      }));

      Message.success(`已帶入 ${rows.length} 筆盤點數量`);
    },
    [items],
  );

  const columns: TableColumn<InventoryCountOrderItemFragment>[] = [
    {
      key: 'actions',
      title: '操作',
      width: 72,
      render: (item) =>
        isCounting && item.isAddition ? (
          <Button
            type="button"
            size="sub"
            variant="destructive-ghost"
            icon={TrashIcon}
            onClick={async () => {
              await removeInventoryCountItem({
                variables: { id, itemId: item.id },
              });
              Message.success('已移除項目');
            }}
          />
        ) : null,
    },
    {
      key: 'countedQuantity',
      title: '盤點數量',
      width: 140,
      render: (item) =>
        isCounting ? (
          <Input
            size="sub"
            value={quantityOf(item)}
            placeholder="輸入數量"
            onChange={(event) =>
              setDraft((previous) => ({
                ...previous,
                [item.id]: {
                  quantity: event.target.value.replace(/[^0-9.]/g, ''),
                  unitId: unitOf(item),
                },
              }))
            }
          />
        ) : (
          quantityOf(item) || '-'
        ),
    },
    {
      key: 'bookQuantity',
      title: '帳面數量',
      width: 120,
      render: (item) => item.bookQuantity,
    },
    {
      key: 'unit',
      title: '單位',
      width: 120,
      render: (item) => {
        const options = unitOptions(item);
        const currentId = unitOf(item) ?? BASE_UNIT;
        const current =
          options.find((option) => option.id === currentId) ?? options[0];

        return isCounting ? (
          <Select
            size="sub"
            value={current}
            options={options}
            onChange={(value) =>
              setDraft((previous) => ({
                ...previous,
                [item.id]: {
                  quantity: quantityOf(item),
                  unitId: (value as SelectValue<string>).id,
                },
              }))
            }
          />
        ) : (
          (current?.name ?? '-')
        );
      },
    },
    {
      key: 'materialKey',
      title: '料號',
      width: 165,
      render: (item) => item.material?.key ?? '-',
    },
    {
      key: 'materialDescription',
      title: '物料說明',
      width: 200,
      render: (item) => item.material?.description ?? '-',
    },
    {
      key: 'batch',
      title: '批號',
      width: 165,
      render: (item) => item.batch?.key ?? '-',
    },
    {
      key: 'location',
      title: '儲存位置',
      width: 165,
      render: (item) => item.location?.key ?? '-',
    },
    {
      key: 'loader',
      title: '載具',
      width: 140,
      render: (item) => item.loader?.serialId ?? '-',
    },
  ];

  if (loading && !order) {
    return <Loading />;
  }

  if (!order) {
    return <PageWrapper title="盤點">查無此盤點單</PageWrapper>;
  }

  const varianceToggle = (
    <Toggle
      className={classes.varianceToggle}
      checked={onlyVariance}
      label="顯示盤差項目"
      onChange={(event) => setOnlyVariance(event.target.checked)}
    />
  );

  const itemsTable = (
    <Table<InventoryCountOrderItemFragment>
      tableKey="InventoryCountItems"
      columns={columns}
      dataSource={dataSource}
      loading={loading}
    />
  );

  return (
    <PageWrapper title={order.name}>
      <SectionWrapper>
        <div className={classes.info}>
          <div>
            <Typography variant="caption">名稱</Typography>
            <Typography variant="body">{order.name}</Typography>
          </div>
          <div>
            <Typography variant="caption">盤點日期</Typography>
            <Typography variant="body">
              {dayjs(order.countDate).format('YYYY-MM-DD')}
            </Typography>
          </div>
          <div>
            <Typography variant="caption">盤點範圍</Typography>
            <Typography variant="body">
              {order.locations.map(({ key }) => key).join('、') || '-'}
            </Typography>
          </div>
          <div>
            <Typography variant="caption">建立者</Typography>
            <Typography variant="body">{order.createdBy || '-'}</Typography>
          </div>
          <div>
            <Typography variant="caption">狀態</Typography>
            <Status status={order.status} />
          </div>
          <div className={classes.fileActions}>
            <Button
              type="button"
              variant="base-secondary"
              icon={DownloadIcon}
              iconType="leading"
              onClick={onDownload}
            >
              下載盤點清單
            </Button>
            {isCounting && (
              <>
                <Button
                  type="button"
                  variant="base-secondary"
                  icon={UploadIcon}
                  iconType="leading"
                  onClick={() => uploadRef.current?.click()}
                >
                  上傳盤點結果
                </Button>
                <input
                  ref={uploadRef}
                  type="file"
                  accept=".csv,text/csv"
                  hidden
                  onChange={(event) => {
                    const file = event.target.files?.[0];

                    if (file) onUpload(file);

                    event.target.value = '';
                  }}
                />
              </>
            )}
          </div>
        </div>
      </SectionWrapper>

      {/* `TableWrapper`'s create slot is a discriminated union — the two
          props are either both present or both absent — so the counting and
          read-only cases are two elements rather than one with spread props. */}
      {isCounting ? (
        <TableWrapper
          title="庫存項目"
          otherActions={varianceToggle}
          createText="新增庫存"
          onCreate={() => setAddModalOpened(true)}
        >
          {itemsTable}
        </TableWrapper>
      ) : (
        <TableWrapper title="庫存項目" otherActions={varianceToggle}>
          {itemsTable}
        </TableWrapper>
      )}

      <div className={classes.footer}>
        {(status === InventoryCountStatus.PENDING || isCounting) && (
          <Button type="button" variant="destructive-ghost" onClick={onCancel}>
            取消盤點
          </Button>
        )}
        <div className={classes.footerRight}>
          {status === InventoryCountStatus.PENDING && (
            <Button type="button" variant="base-primary" onClick={onStart}>
              開始盤點
            </Button>
          )}
          {isCounting && (
            <>
              <Button type="button" variant="base-secondary" onClick={onReset}>
                清空重填
              </Button>
              <Button type="button" variant="base-secondary" onClick={onSave}>
                暫存結果
              </Button>
              <Button
                type="button"
                variant="base-primary"
                loading={settling}
                disabled={settling}
                onClick={onSettle}
              >
                執行盤差
              </Button>
            </>
          )}
        </div>
      </div>

      {settling && (
        <div className={classes.settlingOverlay}>
          <Loading />
          <Typography variant="body">盤差執行中，請勿離開此頁面…</Typography>
        </div>
      )}

      <AddStockModal
        orderId={id}
        open={addModalOpened}
        closeModal={() => setAddModalOpened(false)}
      />
    </PageWrapper>
  );
}

export default ViewInventoryCount;
