import { useMemo, useEffect } from 'react';
import {
  Typography,
  Button,
  Description,
  DescriptionContent,
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
  const { inventorySignature, updateInventoryQuantity, updateInventoryUnitId } =
    useInventoryActions();

  const currentSignature = useMemo(
    () => inventorySignature[inventory.id],
    [inventory.id, inventorySignature],
  );

  const currentUnitId = useMemo(() => {
    return currentSignature.unitId;
  }, [currentSignature.unitId]);

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

  const quantity = useMemo(() => {
    if (currentUnitId) {
      const conversionFactor = inventory.material.materialUnits.find(
        (u) => u.id === currentUnitId,
      )?.conversionFactor;

      if (conversionFactor) {
        return inventory.quantity / conversionFactor;
      }

      return inventory.quantity;
    }

    return inventory.quantity;
  }, [currentUnitId, inventory.material.materialUnits, inventory.quantity]);

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
            // onClick={onRemove}
          />
        </div>
      </div>
      <div className={classes.contentWrapper}>
        <Description title="庫存 :" widthType="hug">
          <DescriptionContent>{`${quantity}`}</DescriptionContent>
        </Description>
        {/* <SelectInputField
          name={`stocks.${index}.inputQuantity`}
          selectName={`stocks.${index}.selectedUnit`}
          label=""
          inputType="number"
          options={values.units}
        /> */}
      </div>
    </div>
  );
};

export default InventoryCard;
