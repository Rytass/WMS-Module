import { useMemo } from 'react';
import { Typography, Button, Empty, cx } from '@mezzanine-ui/react';
import { AggregatedStockFragment } from '../../../../graphql/generated/.graphql';
import { useInventoryActions } from '../../../inventoryActions/useInventoryActions';
import InventoryGrid from '../../../inventoryActions/InventoryGrid';
import {
  haveAdditionalFields,
  isEnableActionStatus,
} from '../../../../utils/inventoryActions';
import classes from './index.module.scss';

interface OperateAreaProps {
  inventoryList: AggregatedStockFragment[];
  queryInventoryListLoading: boolean;
}

const OperateArea: FC<OperateAreaProps> = ({
  inventoryList,
  queryInventoryListLoading,
}) => {
  const { targetAction, targetInventoryIds, removeInventoryByIds } =
    useInventoryActions();
  const haveAdditionalBlock = useMemo(
    () =>
      (targetAction && haveAdditionalFields(targetAction.id)) || !targetAction,
    [targetAction],
  );
  const notEnableInventory = useMemo(
    () =>
      inventoryList.filter(
        (item) => !isEnableActionStatus(item.status, targetAction?.status),
      ),
    [inventoryList, targetAction?.status],
  );

  return (
    <div
      className={cx(classes.host, {
        [classes.haveAdditionalBlock]: haveAdditionalBlock,
      })}
    >
      <div className={classes.block}>
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
                onClick={() => {
                  removeInventoryByIds(inventoryList.map((item) => item.id));
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
      </div>
      {haveAdditionalBlock && (
        <div className={classes.block}>
          <Typography variant="h3" color="text-neutral-solid">
            操作設定
          </Typography>
          <div className={classes.placeholderWrapper}>
            <Empty
              title="尚未選擇操作功能"
              description="請先選擇上方的功能，以顯示可設定的項目。"
              size="main"
              type="system"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default OperateArea;
