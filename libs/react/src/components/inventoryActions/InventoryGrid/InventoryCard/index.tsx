import { useMemo, useEffect } from 'react';
import {
  ControlFieldSlotLayout,
  FormFieldLayout,
} from '@mezzanine-ui/core/form';
import {
  Icon,
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
import {
  TrashIcon,
  ErrorFilledIcon,
  WarningFilledIcon,
} from '@mezzanine-ui/icons';
import { StockInActionsFragment } from '../../../../graphql/generated/.graphql';
import { stockStatusName } from '../../utils';
import {
  useInventoryActions,
  useInventorySignature,
} from '../../useInventoryActions';
import { BASE_UNIT } from '../../../../utils/share';
import classes from './index.module.scss';

interface InventoryCardProps {
  inventory: StockInActionsFragment;
  onlySelectUnit?: boolean;
  notUpdateError?: boolean;
  isAllSameMaterial?: boolean;
  disabledInput?: boolean;
  disabledCard?: boolean;
}

const InventoryCard: FC<InventoryCardProps> = ({
  inventory,
  onlySelectUnit,
  notUpdateError,
  isAllSameMaterial,
  disabledInput,
  disabledCard,
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
      !targetAction?.condition(inventory) ||
      (targetAction?.needSameMaterial && !isAllSameMaterial) ||
      disabledCard,
    [inventory, targetAction, isAllSameMaterial, disabledCard],
  );

  // Greyed out alone, a card left the operator guessing why. Say which rule
  // it failed; `disabledCard` is the panel's own decision and explains itself.
  const disabledReason = useMemo((): string | null => {
    if (!targetAction) return null;

    if (!targetAction.condition(inventory)) {
      return `目前狀態「${stockStatusName(inventory.status)}」不符合「${targetAction.submitText}」的條件`;
    }

    if (targetAction.needSameMaterial && !isAllSameMaterial) {
      return `${targetAction.submitText}僅能選取相同料號`;
    }

    return null;
  }, [inventory, isAllSameMaterial, targetAction]);

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
    if (!notUpdateError) {
      if (inputQuantity) {
        if (inputQuantity > quantity) {
          updateErrorSignature(inventory.id, '數量大於庫存數量');
        } else if (!Number.isInteger(inputQuantity)) {
          updateErrorSignature(inventory.id, '需要為整數');
        } else if (inputQuantity < 0) {
          updateErrorSignature(inventory.id, '不可小於 0');
        }
      }
    }
  }, [
    currentErrorSignature,
    inputQuantity,
    inventory.id,
    notUpdateError,
    quantity,
    updateErrorSignature,
  ]);

  useEffect(() => {
    if (!notUpdateError) {
      if (currentErrorSignature) {
        if (
          inputQuantity <= quantity &&
          Number.isInteger(inputQuantity) &&
          inputQuantity >= 0
        ) {
          removeErrorSignature(inventory.id);
        }
      }
    }
  }, [
    currentErrorSignature,
    inputQuantity,
    inventory.id,
    notUpdateError,
    quantity,
    removeErrorSignature,
  ]);

  return (
    <div
      className={cx(classes.host, {
        [classes.isDisabled]: isDisabledCard,
      })}
    >
      <div className={classes.wrapper}>
        <div className={classes.titleWrapper}>
          <div
            className={cx(classes.leftTitleWrapper, {
              [classes.onlySelectUnit]: onlySelectUnit,
            })}
          >
            <div className={classes.expandedWrapper}>
              <div className={classes.materialText}>
                <Typography variant="body-highlight" color="text-neutral-solid">
                  {inventory.material.key}
                </Typography>
                {inventory.material.description && (
                  <Typography variant="caption" color="text-neutral">
                    {inventory.material.description}
                  </Typography>
                )}
              </div>
              {onlySelectUnit && inventory.saleId && (
                <Typography variant="caption" color="text-neutral">
                  {saleInformation}
                </Typography>
              )}
            </div>
            <div className={classes.expandedWrapper}>
              <div className={classes.tags}>
                <Typography
                  variant="label-secondary"
                  color="text-neutral"
                  className={classes.tag}
                >
                  {inventory.batch.key}
                </Typography>
                <Typography
                  variant="label-secondary"
                  color="text-neutral"
                  className={classes.tag}
                >
                  {inventory.location.key}
                </Typography>
              </div>
              {onlySelectUnit && (
                <div className={classes.unitSelectorWrapper}>
                  <Description title="庫存 :" widthType="hug">
                    <DescriptionContent>{`${quantity}`}</DescriptionContent>
                  </Description>
                  <FormField
                    name="inventory-unit-select"
                    layout={FormFieldLayout.VERTICAL}
                    controlFieldSlotLayout={ControlFieldSlotLayout.SUB}
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
                      disabled={isDisabledCard || disabledInput || undefined}
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
                disabled={isDisabledCard || disabledInput || undefined}
              />
            </FormField>
          </div>
        )}
      </div>
      {/* Not InlineMessage: its text never wraps, and on a phone card it
          pushed the card wider than the screen. */}
      {disabledReason && (
        <div className={classes.disabledReason}>
          <Icon icon={WarningFilledIcon} size={14} color="warning" />
          <Typography variant="caption" color="text-warning-strong">
            {disabledReason}
          </Typography>
        </div>
      )}
      {currentErrorSignature && (
        <div className={classes.errorWrapper}>
          <Icon icon={ErrorFilledIcon} size={14} color="error" />
          <Typography variant="annotation" color="text-error">
            {currentErrorSignature}
          </Typography>
        </div>
      )}
    </div>
  );
};

export default InventoryCard;
