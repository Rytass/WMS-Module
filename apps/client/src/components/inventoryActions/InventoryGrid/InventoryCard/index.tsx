import { useMemo, useEffect } from 'react';
import {
  ControlFieldSlotLayout,
  FormFieldLayout,
} from '@mezzanine-ui/core/form';
import {
  Typography,
  Button,
  Description,
  DescriptionContent,
  FormField,
  Input,
  Select,
  Message,
  cx,
} from '@mezzanine-ui/react';
import { TrashIcon } from '@mezzanine-ui/icons';
import { AggregatedStockFragment } from '../../../../graphql/generated/.graphql';
import {
  useInventoryActions,
  useInventorySignature,
} from '../../useInventoryActions';
import { isEnableActionStatus } from '../../utils';
import { BASE_UNIT } from '../../../../utils/share';
import classes from './index.module.scss';

interface InventoryCardProps {
  inventory: AggregatedStockFragment;
  onlySelectUnit?: boolean;
  isAllSameMaterial?: boolean;
}

const InventoryCard: FC<InventoryCardProps> = ({
  inventory,
  onlySelectUnit,
  isAllSameMaterial,
}) => {
  const {
    targetAction,
    errorSignature,
    updateInventoryQuantity,
    updateInventoryUnitId,
    removeTargetInventory,
    updateErrorSignature,
    removeErrorSignature,
  } = useInventoryActions();

  const {
    saleInformation,
    currentUnitId,
    unitOptions,
    currentUnitName,
    quantity,
    inputQuantity,
  } = useInventorySignature(inventory);

  const isDisabledCard = useMemo(
    () =>
      !isEnableActionStatus(inventory.status, targetAction?.status) ||
      (targetAction?.needSameMaterial && !isAllSameMaterial),
    [inventory.status, targetAction, isAllSameMaterial],
  );

  const currentErrorSignature = useMemo(
    () => errorSignature[inventory.id],
    [errorSignature, inventory.id],
  );

  useEffect(() => {
    // 如果 query 後找不到對應的 unit，重置他
    if (
      currentUnitId &&
      !inventory.material.materialUnits.find((u) => u.id === currentUnitId)
    ) {
      updateInventoryUnitId(inventory.id, null);
    }
  }, [
    currentUnitId,
    inventory.id,
    inventory.material.materialUnits,
    updateInventoryUnitId,
  ]);

  useEffect(() => {
    if (inputQuantity) {
      if (inputQuantity > quantity) {
        updateErrorSignature(inventory.id, '數量大於庫存數量');
      } else if (!Number.isInteger(inputQuantity)) {
        updateErrorSignature(inventory.id, '需要為整數');
      }
    }
  }, [
    currentErrorSignature,
    inputQuantity,
    inventory.id,
    quantity,
    updateErrorSignature,
  ]);

  useEffect(() => {
    if (currentErrorSignature) {
      if (inputQuantity <= quantity && Number.isInteger(inputQuantity)) {
        removeErrorSignature(inventory.id);
      }
    }
  }, [
    currentErrorSignature,
    inputQuantity,
    inventory.id,
    quantity,
    removeErrorSignature,
  ]);

  return (
    <div
      className={cx(classes.host, {
        [classes.isDisabled]: isDisabledCard,
      })}
    >
      <div className={classes.titleWrapper}>
        <div
          className={cx(classes.leftTitleWrapper, {
            [classes.onlySelectUnit]: onlySelectUnit,
          })}
        >
          <div className={classes.expandedWrapper}>
            <Typography variant="body-highlight" color="text-neutral-solid">
              {inventory.material.key}
            </Typography>
            {onlySelectUnit && inventory.saleId && (
              <Typography variant="caption" color="text-neutral">
                {saleInformation}
              </Typography>
            )}
          </div>
          <div className={classes.expandedWrapper}>
            <Typography
              variant="label-secondary"
              color="text-neutral"
              className={classes.tag}
            >
              {inventory.batch.key}
            </Typography>
            {onlySelectUnit && (
              <div className={classes.unitSelectorWrapper}>
                <Description title="庫存 :" widthType="hug">
                  <DescriptionContent>{`${quantity}`}</DescriptionContent>
                </Description>
                <FormField
                  name="inventory-unit-select"
                  layout={FormFieldLayout.VERTICAL}
                  controlFieldSlotLayout={ControlFieldSlotLayout.SUB}
                  hintText={
                    currentErrorSignature ? currentErrorSignature : undefined
                  }
                  severity={currentErrorSignature ? 'error' : 'info'}
                >
                  <Select
                    fullWidth
                    error={!!currentErrorSignature}
                    size="sub"
                    placeholder="請選擇單位"
                    mode="single"
                    onChange={(option) => {
                      if (option?.id === BASE_UNIT) {
                        updateInventoryUnitId(inventory.id, null);
                      } else {
                        updateInventoryUnitId(
                          inventory.id,
                          option?.id as string,
                        );
                      }
                    }}
                    value={unitOptions.find(
                      (o) => o.id === (currentUnitId || BASE_UNIT),
                    )}
                    options={unitOptions}
                  />
                </FormField>
              </div>
            )}
          </div>
        </div>
        {!onlySelectUnit && (
          <div className={classes.rightTitleWrapper}>
            {inventory.saleId && (
              <Typography variant="caption" color="text-neutral">
                {saleInformation}
              </Typography>
            )}
            <Button
              type="button"
              icon={TrashIcon}
              iconType="icon-only"
              size="minor"
              variant="destructive-ghost"
              onClick={() => {
                removeTargetInventory(inventory.id);

                Message.warning(`料號：${inventory.material.key} / 批號：${inventory.batch.key} / 儲存位置：${inventory.location.key}
已移除${targetAction?.title}`);
              }}
            />
          </div>
        )}
      </div>
      {!onlySelectUnit && (
        <div className={classes.contentWrapper}>
          <Description title="庫存 :" widthType="hug">
            <DescriptionContent>{`${quantity}`}</DescriptionContent>
          </Description>
          <FormField
            name="inventory-input"
            controlFieldSlotLayout={ControlFieldSlotLayout.SUB}
            hintText={currentErrorSignature ? currentErrorSignature : undefined}
            severity={currentErrorSignature ? 'error' : 'info'}
          >
            <Input
              fullWidth
              error={!!currentErrorSignature}
              variant="select"
              value={`${inputQuantity}`}
              onChange={(e) => {
                updateInventoryQuantity(inventory.id, Number(e.target.value));
              }}
              onSelect={(value) => {
                if (value === BASE_UNIT) {
                  updateInventoryUnitId(inventory.id, null);
                } else {
                  updateInventoryUnitId(inventory.id, value as string);
                }
              }}
              placeholder="請輸入數量"
              size="sub"
              selectedValue={currentUnitId || BASE_UNIT}
              selectButton={{
                position: 'suffix',
                value: currentUnitName,
              }}
              options={unitOptions}
              inputType="number"
              inputProps={{
                style: {
                  textAlign: 'right',
                },
              }}
              disabled={isDisabledCard || undefined}
            />
          </FormField>
        </div>
      )}
    </div>
  );
};

export default InventoryCard;
