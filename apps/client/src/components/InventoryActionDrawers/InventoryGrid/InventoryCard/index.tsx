import { useMemo, useEffect } from 'react';
import {
  Typography,
  Button,
  Description,
  DescriptionContent,
  Input,
} from '@mezzanine-ui/react';
import { TrashIcon } from '@mezzanine-ui/icons';
import { AggregatedStockFragment } from '../../../../graphql/generated/.graphql';
import { useInventoryActions } from '../../../inventoryActions/useInventoryActions';
import classes from './index.module.scss';

interface InventoryCardProps {
  inventory: AggregatedStockFragment;
}

const BASE_UNIT = 'BASE_UNIT';

const InventoryCard: FC<InventoryCardProps> = ({ inventory }) => {
  const {
    inventorySignature,
    updateInventoryQuantity,
    updateInventoryUnitId,
    removeTargetInventory,
  } = useInventoryActions();

  const currentSignature = useMemo(
    () => inventorySignature[inventory.id],
    [inventory.id, inventorySignature],
  );

  const currentUnitId = useMemo(() => {
    return currentSignature?.unitId;
  }, [currentSignature?.unitId]);

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

  return (
    <div className={classes.host}>
      <div className={classes.titleWrapper}>
        <div className={classes.leftTitleWrapper}>
          <Typography variant="body-highlight" color="text-neutral-solid">
            {inventory.material.key}
          </Typography>
          <Typography
            variant="label-secondary"
            color="text-neutral"
            className={classes.tag}
          >
            {inventory.batch.key}
          </Typography>
        </div>
        <div className={classes.rightTitleWrapper}>
          {/* <Typography variant="caption" color="text-neutral">
            SO240596827-00100043
          </Typography> */}
          <Button
            type="button"
            icon={TrashIcon}
            iconType="icon-only"
            size="minor"
            variant="destructive-ghost"
            onClick={() => {
              removeTargetInventory(inventory.id);
            }}
          />
        </div>
      </div>
      <div className={classes.contentWrapper}>
        <Description title="庫存 :" widthType="hug">
          <DescriptionContent>{`${quantity}`}</DescriptionContent>
        </Description>
        <Input
          fullWidth
          // error={isError}
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
        />
      </div>
    </div>
  );
};

export default InventoryCard;
