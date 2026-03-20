import { useMemo, useEffect } from 'react';
import { ControlFieldSlotLayout } from '@mezzanine-ui/core/form';
import {
  Typography,
  Button,
  Description,
  DescriptionContent,
  FormField,
  Input,
  Message,
  cx,
} from '@mezzanine-ui/react';
import { TrashIcon } from '@mezzanine-ui/icons';
import { AggregatedStockFragment } from '../../../../graphql/generated/.graphql';
import { useInventoryActions } from '../../useInventoryActions';
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
    inventorySignature,
    errorSignature,
    updateInventoryQuantity,
    updateInventoryUnitId,
    removeTargetInventory,
    updateErrorSignature,
    removeErrorSignature,
  } = useInventoryActions();

  const currentSignature = useMemo(
    () => inventorySignature[inventory.id],
    [inventory.id, inventorySignature],
  );

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

  const currentUnitId = useMemo(() => {
    return currentSignature?.unitId;
  }, [currentSignature?.unitId]);

  const saleInformation = useMemo(
    () =>
      `${inventory.saleId}${inventory.saleSerialId ? `-${inventory.saleSerialId}` : ''}`,
    [inventory.saleId, inventory.saleSerialId],
  );

  const unitOptions = useMemo(
    () => [
      {
        id: BASE_UNIT,
        name: inventory.material.baseUnit.key,
      },
      ...inventory.material.materialUnits.map((u) => ({
        id: u.id,
        name: u.unit,
      })),
    ],
    [inventory.material.baseUnit.key, inventory.material.materialUnits],
  );

  const currentUnitName = useMemo(() => {
    return (
      unitOptions.find((o) => o.id === (currentUnitId || BASE_UNIT))?.name ?? ''
    );
  }, [currentUnitId, unitOptions]);

  const quantity = useMemo(() => {
    if (currentUnitId) {
      const conversionFactor = inventory.material.materialUnits.find(
        (u) => u.id === currentUnitId,
      )?.conversionFactor;

      if (conversionFactor) {
        return Math.round((inventory.quantity / conversionFactor) * 100) / 100;
      }

      return inventory.quantity;
    }

    return inventory.quantity;
  }, [currentUnitId, inventory.material.materialUnits, inventory.quantity]);

  const inputQuantity = useMemo(
    () => currentSignature?.quantity,
    [currentSignature?.quantity],
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
              <div>
                <Description title="庫存 :" widthType="hug">
                  <DescriptionContent>{`${quantity}`}</DescriptionContent>
                </Description>
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
