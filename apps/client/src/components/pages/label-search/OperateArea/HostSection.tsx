import { useMemo, ReactNode } from 'react';
import { Typography, Button, Empty, cx } from '@mezzanine-ui/react';
import SectionWrapper from '../../../SectionWrapper';
import { useDialog } from '../../../dialog/useDialog';
import { AggregatedStockFragment } from '../../../../graphql/generated/.graphql';
import { useInventoryActions } from '../../../inventoryActions/useInventoryActions';
import InventoryGrid from '../../../inventoryActions/InventoryGrid';
import { haveAdditionalFields } from '../../../inventoryActions/utils';
import AdditionalBlock from './AdditionalBlock';
import classes from './index.module.scss';

interface HostSectionProps {
  inventoryList: AggregatedStockFragment[];
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

  return (
    <div
      className={cx(classes.host, {
        [classes.haveAdditionalBlock]: haveAdditionalBlock,
      })}
    >
      <SectionWrapper className={classes.block}>
        {customizedMainBlock ? (
          customizedMainBlock
        ) : (
          <>
            <div className={classes.titleWrapper}>
              <Typography variant="h3" color="text-neutral-solid">
                {inventoryList.length > 0
                  ? `已選項目 (${inventoryList.length})`
                  : '已選項目'}
              </Typography>
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
