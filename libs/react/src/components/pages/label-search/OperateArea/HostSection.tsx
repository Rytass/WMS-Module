import { FormEvent, useEffect, useMemo, useState, ReactNode } from 'react';
import { useFormContext } from 'react-hook-form';
import {
  Typography,
  Button,
  Empty,
  Tab,
  TabItem,
  cx,
} from '@mezzanine-ui/react';
import { useCompactLayout } from '../../../../hooks/useCompactLayout';
import SectionWrapper from '../../../SectionWrapper';
import { useDialog } from '../../../dialog/useDialog';
import { StockInActionsFragment } from '../../../../graphql/generated/.graphql';
import { useInventoryActions } from '../../../inventoryActions/useInventoryActions';
import InventoryGrid from '../../../inventoryActions/InventoryGrid';
import { haveAdditionalFields } from '../../../inventoryActions/utils';
import AdditionalBlock from './AdditionalBlock';
import classes from './index.module.scss';

interface HostSectionProps {
  inventoryList: StockInActionsFragment[];
  queryInventoryListLoading: boolean;
  customizedMainBlock?: ReactNode;
  onlySelectUnit?: boolean;
  notUpdateError?: boolean;
  disabledInput?: boolean;
  disabledCard?: boolean;
}

const HostSection: FC<HostSectionProps> = ({
  inventoryList,
  queryInventoryListLoading,
  customizedMainBlock,
  onlySelectUnit,
  notUpdateError,
  disabledInput,
  disabledCard,
}) => {
  const { openDialog } = useDialog();
  const { targetAction, targetInventoryIds, removeInventoryByIds } =
    useInventoryActions();

  const haveAdditionalBlock = useMemo(
    () =>
      (targetAction && haveAdditionalFields(targetAction.id)) || !targetAction,
    [targetAction],
  );
  const notEnableInventory = useMemo(
    () => inventoryList.filter((item) => !targetAction?.condition(item)),
    [inventoryList, targetAction],
  );

  // On a phone the two columns become two tabs. Both stay mounted and only
  // one is shown, so switching never drops what was typed into the other.
  const compact = useCompactLayout();
  const [pane, setPane] = useState<'items' | 'settings'>('items');
  const showTabs = compact && haveAdditionalBlock;

  // The panel without an action renders outside any form.
  const form = useFormContext() as ReturnType<typeof useFormContext> | null;
  const submitCount = form?.formState.submitCount ?? 0;
  const hasErrors = Object.keys(form?.formState.errors ?? {}).length > 0;

  // A rejected submit with the settings tab hidden would look like nothing
  // happened: bring the fields that failed into view.
  useEffect(() => {
    if (showTabs && submitCount > 0 && hasErrors) setPane('settings');
  }, [hasErrors, showTabs, submitCount]);

  // Fields marked `required` are stopped by the browser before the form
  // library ever runs, and a control inside a hidden pane cannot show its
  // bubble — on a phone the submit just did nothing. Catch the native event,
  // reveal the pane, then let the browser point at the field.
  const onInvalidCapture = (event: FormEvent<HTMLDivElement>): void => {
    if (!showTabs || pane === 'settings') return;

    const control = event.target;

    setPane('settings');

    if (
      control instanceof HTMLInputElement ||
      control instanceof HTMLSelectElement ||
      control instanceof HTMLTextAreaElement
    ) {
      requestAnimationFrame(() => control.reportValidity());
    }
  };

  return (
    <div
      className={cx(classes.host, {
        [classes.haveAdditionalBlock]: haveAdditionalBlock,
        [classes.tabbed]: showTabs,
        [classes.showSettings]: showTabs && pane === 'settings',
      })}
      onInvalidCapture={onInvalidCapture}
    >
      {showTabs && (
        <Tab
          className={classes.tabs}
          size="sub"
          activeKey={pane}
          onChange={(key) => setPane(key === 'settings' ? 'settings' : 'items')}
        >
          <TabItem key="items">
            {inventoryList.length > 0
              ? `已選項目 (${inventoryList.length})`
              : '已選項目'}
          </TabItem>
          <TabItem key="settings" error={hasErrors}>
            操作設定
          </TabItem>
        </Tab>
      )}
      <SectionWrapper className={classes.block}>
        {customizedMainBlock ? (
          customizedMainBlock
        ) : (
          <>
            <div className={classes.titleWrapper}>
              {!showTabs && (
                <Typography variant="h3" color="text-neutral-solid">
                  {inventoryList.length > 0
                    ? `已選項目 (${inventoryList.length})`
                    : '已選項目'}
                </Typography>
              )}
              {inventoryList.length > 0 && (
                <div className={classes.clearButtons}>
                  <Button
                    type="button"
                    variant="base-secondary"
                    size="minor"
                    onClick={async () => {
                      const isConfirm = await openDialog({
                        modalStatusType: 'delete',
                        title: '清空所有選項',
                        supportingText:
                          '清空後所有內容將永久移除且無法復原。確認要清空嗎？',
                        cancelText: '取消',
                        confirmText: '清空',
                        confirmButtonProps: {
                          variant: 'destructive-primary',
                        },
                      });

                      if (isConfirm) {
                        removeInventoryByIds(
                          inventoryList.map((item) => item.id),
                        );
                      }
                    }}
                  >
                    清空所有項目
                  </Button>
                  <Button
                    type="button"
                    variant="base-secondary"
                    size="minor"
                    disabled={notEnableInventory.length === 0}
                    onClick={() => {
                      removeInventoryByIds(
                        notEnableInventory.map((item) => item.id),
                      );
                    }}
                  >
                    清空未通過項目
                  </Button>
                </div>
              )}
            </div>
            {targetInventoryIds.length > 0 ? (
              <InventoryGrid
                inventoryList={inventoryList}
                queryInventoryListLoading={queryInventoryListLoading}
                haveTitle={false}
                expandedLayout
                notUpdateError={notUpdateError}
                onlySelectUnit={onlySelectUnit}
                disabledInput={disabledInput}
                disabledCard={disabledCard}
              />
            ) : (
              <div className={classes.placeholderWrapper}>
                <Empty
                  title="尚未加入任何項目"
                  description="請加入項目以開始使用。"
                  size="main"
                  type="initial-data"
                />
              </div>
            )}
          </>
        )}
      </SectionWrapper>
      {haveAdditionalBlock && (
        <AdditionalBlock
          inventoryList={inventoryList}
          queryInventoryListLoading={queryInventoryListLoading}
        />
      )}
    </div>
  );
};

export default HostSection;
