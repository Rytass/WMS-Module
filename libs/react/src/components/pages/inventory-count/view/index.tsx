import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { isNull } from 'lodash';
import { FormProvider, useForm } from 'react-hook-form';
import {
  Button,
  Icon,
  Input,
  Message,
  Select,
  SelectValue,
  TableColumn,
  Toggle,
  Typography,
} from '@mezzanine-ui/react';
import {
  DangerousOutlineIcon,
  DownloadIcon,
  LockIcon,
  TrashIcon,
  UploadIcon,
} from '@mezzanine-ui/icons';
import { useWmsRouter } from '../../../../router/context';
import Loading from '../../../Loading';
import PageWrapper from '../../../PageWrapper';
import SectionWrapper from '../../../SectionWrapper';
import TableWrapper from '../../../TableWrapper';
import Table from '../../../TableWrapper/Table';
import { useDialog } from '../../../dialog/useDialog';
import InputField from '../../../fields/InputField';
import DateField from '../../../fields/DateField';
import LocationScopeField from '../CreateForm/LocationScopeField';
import { WaitIcon, TransferIcon } from '../../../../icons';
import Status from '../Status';
import AddStockModal from './AddStockModal';
import ItemFilters from './ItemFilters';
import {
  CSV_EXPORT_LIMIT,
  useInventoryCountMutations,
  useLazyQueryAllInventoryCountOrderItems,
  useQueryInventoryCountOrder,
  useQueryInventoryCountOrderItems,
} from '../useApi';
import {
  InventoryCountOrderItemFragment,
  InventoryCountStatus,
} from '../../../../graphql/generated/.graphql';
import { BASE_UNIT } from '../../../../utils/share';
import { NextPath } from '../../../../utils/nextpath';
import { buildCountSheetCsv, downloadCsv, parseCountSheetCsv } from '../csv';
import { ItemFilterValues, QuickFilterKey } from '../typing';
import classes from './index.module.scss';

/** Counted quantities being edited, keyed by item id. */
type CountDraft = Record<string, { quantity: string; unitId: string | null }>;

/** How long a freshly added row stays highlighted. */
const HIGHLIGHT_MS = 3000;

/** The header fields an operator may still change before the count starts. */
interface InfoFormValues {
  name: string;
  countDate: string;
  locations: SelectValue<string>[];
}

function ViewInventoryCount() {
  const { params } = useWmsRouter();
  const id = useMemo(() => (params?.id as string) ?? '', [params?.id]);
  const { openDialog } = useDialog();

  const [itemFilter, setItemFilter] = useState<ItemFilterValues>({});

  const { data, loading } = useQueryInventoryCountOrder(id);
  const {
    data: itemsData,
    loading: itemsLoading,
    pageTotal,
    page,
    setPage,
    limit,
    setLimit,
  } = useQueryInventoryCountOrderItems(id, itemFilter);
  const { fetchAllItems } = useLazyQueryAllInventoryCountOrderItems();
  const {
    updateInventoryCountOrder,
    startInventoryCount,
    countInventory,
    resetInventoryCount,
    cancelInventoryCount,
    settleInventoryCount,
    removeInventoryCountItem,
  } = useInventoryCountMutations();

  const [draft, setDraft] = useState<CountDraft>({});
  const [addModalOpened, setAddModalOpened] = useState<boolean>(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
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
  const isPending = status === InventoryCountStatus.PENDING;

  const items = useMemo(
    (): InventoryCountOrderItemFragment[] =>
      itemsData?.inventoryCountOrderItems.items ?? [],
    [itemsData?.inventoryCountOrderItems.items],
  );

  /* ------------------------------------------------------------------ *
   * Header — editable while the count has not started
   * ------------------------------------------------------------------ */

  const infoMethods = useForm<InfoFormValues>({
    defaultValues: { name: '', countDate: '', locations: [] },
  });

  useEffect(() => {
    if (!order) return;

    infoMethods.reset({
      name: order.name ?? '',
      countDate: dayjs(order.countDate).format('YYYY-MM-DD'),
      locations: order.locations.map(({ id: locationId, key }) => ({
        id: locationId,
        name: key,
      })),
    });
    // `infoMethods` is stable across renders; listing it would reset the form on
    // every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order]);

  /**
   * Save on focus leaving the header block.
   *
   * React's `onBlur` is the bubbling `focusout`, so one handler on the wrapper
   * covers every field including the multi-select, which has no meaningful blur
   * of its own but does move focus out when the menu closes.
   *
   * The guard compares against the order rather than reading
   * `formState.isDirty`: react-hook-form only keeps `isDirty` current for fields
   * whose form state was subscribed during render, and this block never reads it
   * while rendering — so it stays `false` and every save is skipped. Comparing
   * values is also the honest question to ask, since re-selecting the same scope
   * should not fire a mutation.
   */
  const onInfoBlur = useCallback(async () => {
    if (!order) return;

    const values = infoMethods.getValues();
    const locationIds = values.locations.map((location) => location.id);
    const currentLocationIds = order.locations.map(
      (location) => location.id as string,
    );

    const unchanged =
      values.name === order.name &&
      values.countDate === dayjs(order.countDate).format('YYYY-MM-DD') &&
      locationIds.length === currentLocationIds.length &&
      locationIds.every((locationId) =>
        currentLocationIds.includes(locationId),
      );

    if (unchanged) return;

    await updateInventoryCountOrder({
      variables: {
        id,
        name: values.name || undefined,
        countDate: values.countDate || undefined,
        locationIds,
      },
    });

    Message.success('已更新盤點單');
  }, [id, infoMethods, order, updateInventoryCountOrder]);

  /* ------------------------------------------------------------------ *
   * Count sheet
   * ------------------------------------------------------------------ */

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
    // Starting locks every scoped location against stock movement, so the
    // operator confirms before the rest of the warehouse feels it.
    const isConfirm = await openDialog({
      title: '確認開始盤點',
      children:
        '系統將鎖定盤點範圍的庫存禁止異動行為。請確認是否要繼續，以便順利完成操作。',
      modalStatusType: 'info',
      confirmText: '繼續',
    });

    if (!isConfirm) return;

    await startInventoryCount({ variables: { id } });
    Message.success('已開始盤點');
  }, [id, openDialog, startInventoryCount]);

  const onSettle = useCallback(async () => {
    const isConfirm = await openDialog({
      title: '資訊提示',
      children:
        '系統將根據盤點數量以及帳面數量進行帳面數量的盤差。請確認是否要繼續，以便順利完成操作。',
      modalStatusType: 'info',
      confirmText: '繼續',
    });

    if (!isConfirm) return;

    setSettling(true);

    try {
      // Flush anything still in the inputs first: settling what is on screen is
      // the only behaviour that cannot surprise the operator.
      await saveDraft();
      await settleInventoryCount({ variables: { id } });
      Message.success('執行盤差成功');
    } finally {
      setSettling(false);
    }
  }, [id, openDialog, saveDraft, settleInventoryCount]);

  const onCancel = useCallback(async () => {
    const isConfirm = await openDialog({
      title: '確認取消盤點',
      children:
        '您目前的盤點尚未完成，取消盤點將捨棄未保存的內容。確定要取消盤點嗎？',
      cancelText: '繼續編輯',
      confirmText: '取消盤點',
      confirmButtonProps: {
        variant: 'destructive-primary',
      },
    });

    if (!isConfirm) return;

    await cancelInventoryCount({ variables: { id } });
    Message.success('已成功取消盤點');
  }, [cancelInventoryCount, id, openDialog]);

  const onReset = useCallback(async () => {
    const isConfirm = await openDialog({
      title: '清空重填',
      children: '將清除所有已填寫的盤點數量與新增的庫存項目，確定嗎？',
      confirmButtonProps: {
        variant: 'destructive-primary',
      },
    });

    if (!isConfirm) return;

    await resetInventoryCount({ variables: { id } });
    setDraft({});
    Message.success('已清空盤點內容');
  }, [id, openDialog, resetInventoryCount]);

  /**
   * The download has to be the *whole* sheet, not the page on screen: an
   * operator handed a truncated file would fill it in and settlement would write
   * off every line the export dropped. Hence a separate unpaginated fetch rather
   * than reusing the table's data.
   */
  const onDownload = useCallback(async () => {
    if (!order) return;

    const { data: all } = await fetchAllItems({
      variables: { id, limit: CSV_EXPORT_LIMIT, offset: 0 },
    });

    downloadCsv(
      `${order.key}_盤點清單.csv`,
      buildCountSheetCsv(order.key, all?.inventoryCountOrderItems.items ?? []),
    );
  }, [fetchAllItems, id, order]);

  const onUpload = useCallback(
    async (file: File) => {
      // Matched against the whole sheet, not the visible page: the file the
      // operator filled in was exported unfiltered.
      const { data: all } = await fetchAllItems({
        variables: { id, limit: CSV_EXPORT_LIMIT, offset: 0 },
      });
      const sheet = all?.inventoryCountOrderItems.items ?? [];
      const { rows, errors } = parseCountSheetCsv(await file.text(), sheet);

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
    [fetchAllItems, id],
  );

  /* ------------------------------------------------------------------ *
   * Filtering
   * ------------------------------------------------------------------ */

  /**
   * Click a cell, filter by it.
   *
   * Replaces that one key rather than adding to it — the gesture reads as
   * "show me this shelf", and stacking would leave the operator with an
   * intersection they never asked for and cannot see.
   */
  const quickFilter = useCallback(
    (key: QuickFilterKey, value: string | null | undefined) => {
      if (!value) return;

      setItemFilter((previous) => ({ ...previous, [key]: value }));
      setPage(1);
    },
    [setPage],
  );

  const renderQuickFilter = useCallback(
    (key: QuickFilterKey, value: string | null | undefined) =>
      value ? (
        <button
          type="button"
          className={classes.quickFilter}
          onClick={() => quickFilter(key, value)}
        >
          {value}
        </button>
      ) : (
        '-'
      ),
    [quickFilter],
  );

  const onFilterSubmit = useCallback(
    (values: ItemFilterValues) => {
      setItemFilter((previous) => ({
        ...values,
        onlyVariance: previous.onlyVariance,
      }));
      setPage(1);
    },
    [setPage],
  );

  /* ------------------------------------------------------------------ *
   * Columns
   * ------------------------------------------------------------------ */

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
    /*
     * The three status icons are snapshots taken when the count started, not
     * live stock flags — the whole point of the snapshot is that the variance is
     * measured against the world as it was at that moment. They render exactly
     * as the stock list renders them so an operator reads them the same way,
     * which includes needing both halves of "awaiting inspection": a null
     * result alone is the resting state of almost every batch.
     */
    {
      key: 'inspectionResult',
      title: '待檢驗',
      width: 48,
      align: 'center',
      render: (item) =>
        item.requiresInspection && isNull(item.inspectionResult) ? (
          <Icon icon={WaitIcon} color="brand" size={16} />
        ) : item.inspectionResult === false ? (
          <Icon icon={DangerousOutlineIcon} color="error" size={16} />
        ) : null,
    },
    {
      key: 'held',
      title: '凍結',
      width: 48,
      align: 'center',
      render: (item) =>
        item.held ? <Icon icon={LockIcon} color="brand" size={16} /> : null,
    },
    {
      key: 'inTransfer',
      title: '調撥',
      width: 48,
      align: 'center',
      render: (item) =>
        item.transferId ? (
          <Icon icon={TransferIcon} color="brand" size={16} />
        ) : null,
    },
    {
      key: 'materialKey',
      title: '料號',
      width: 165,
      render: (item) => renderQuickFilter('materialKey', item.material?.key),
    },
    {
      key: 'materialDescription',
      title: '物料說明',
      width: 200,
      render: (item) =>
        renderQuickFilter('materialDescription', item.material?.description),
    },
    {
      key: 'batch',
      title: '批號',
      width: 165,
      render: (item) => renderQuickFilter('batchKey', item.batch?.key),
    },
    {
      key: 'location',
      title: '儲存位置',
      width: 165,
      render: (item) => renderQuickFilter('locationKey', item.location?.key),
    },
    {
      key: 'loader',
      title: '載具',
      width: 140,
      render: (item) =>
        renderQuickFilter('loaderSerialId', item.loader?.serialId),
    },
    {
      key: 'vendorId',
      title: '供應商',
      width: 140,
      render: (item) => renderQuickFilter('vendorId', item.vendorId),
    },
    {
      key: 'customerId',
      title: '客戶',
      width: 140,
      render: (item) => renderQuickFilter('customerId', item.customerId),
    },
    {
      key: 'saleId',
      title: '銷售訂單號碼',
      width: 140,
      render: (item) => renderQuickFilter('saleId', item.saleId),
    },
    {
      key: 'saleSerialId',
      title: '銷售訂單項次',
      width: 140,
      render: (item) => renderQuickFilter('saleSerialId', item.saleSerialId),
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
      checked={itemFilter.onlyVariance ?? false}
      label="僅顯示盤差項目"
      onChange={(event) => {
        setItemFilter((previous) => ({
          ...previous,
          onlyVariance: event.target.checked,
        }));
        setPage(1);
      }}
    />
  );

  const itemsTable = (
    <Table<InventoryCountOrderItemFragment>
      tableKey="InventoryCountItems"
      columns={columns}
      dataSource={items}
      loading={itemsLoading}
      rowState={(item) => (item.id === highlightedId ? 'added' : undefined)}
      pagination={{
        current: page,
        onChange: (next) => setPage(next),
        total: pageTotal,
        pageSize: limit,
        onChangePageSize: (size) => setLimit(size),
      }}
    />
  );

  return (
    <PageWrapper
      title={order.name}
      breadcrumb={[
        { label: '盤點', href: NextPath.INVENTORYCOUNT },
        { label: order.name },
      ]}
      haveBack
    >
      <SectionWrapper>
        {isPending ? (
          <FormProvider {...infoMethods}>
            {/* Blur-save: the header is a handful of fields, and an explicit
                save button here competes with the page's real actions. */}
            <div className={classes.info} onBlur={onInfoBlur}>
              <InputField name="name" label="名稱" placeholder="輸入名稱" />
              <DateField
                name="countDate"
                label="盤點日期"
                placeholder="選擇日期"
              />
              <LocationScopeField name="locations" />
              <div>
                <Typography variant="caption">建立者</Typography>
                <Typography variant="body">{order.createdBy || '-'}</Typography>
              </div>
              <div>
                <Typography variant="caption">狀態</Typography>
                <Status status={order.status} />
              </div>
            </div>
          </FormProvider>
        ) : (
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
          </div>
        )}
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
      </SectionWrapper>

      <ItemFilters onSubmit={onFilterSubmit} values={itemFilter} />

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
        {(isPending || isCounting) && (
          <Button type="button" variant="destructive-ghost" onClick={onCancel}>
            取消盤點
          </Button>
        )}
        <div className={classes.footerRight}>
          {isPending && (
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
          <div className={classes.settlingCard}>
            <Loading />
            <Typography variant="h3">執行盤差中</Typography>
            <Typography variant="body">執行盤差作業中，請稍候 ...</Typography>
          </div>
        </div>
      )}

      <AddStockModal
        orderId={id}
        open={addModalOpened}
        closeModal={() => setAddModalOpened(false)}
        onCreated={(itemId) => {
          // Additions already sort first server-side, so clearing the filters
          // and going back to page 1 is what actually puts the new line on top;
          // the highlight then says which one it is.
          setItemFilter({});
          setPage(1);
          setHighlightedId(itemId);
          setTimeout(() => setHighlightedId(null), HIGHLIGHT_MS);
        }}
      />
    </PageWrapper>
  );
}

export default ViewInventoryCount;
