import { useMemo } from 'react';
import { Typography, Button, cx } from '@mezzanine-ui/react';
import { FormFieldLayout } from '@mezzanine-ui/core/form';
import { TrashIcon } from '@mezzanine-ui/icons';
import { AggregatedStockFragment } from '../../../../../graphql/generated/.graphql';
import { useInventoryActions } from '../../../useInventoryActions';
import { BASE_UNIT } from '../../../../../utils/share';
import InputField from '../../../../fields/InputField';
import NumberInputField from '../../../../fields/NumberInputField';
import classes from './index.module.scss';

interface SplitBatchFieldArrayItemProps {
  index: number;
  remove: VoidFunction;
  inventory: AggregatedStockFragment;
}

const SplitBatchFieldArrayItem: FC<SplitBatchFieldArrayItemProps> = ({
  index,
  remove,
  inventory,
}) => {
  const { inventorySignature } = useInventoryActions();

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

  const saleInformation = useMemo(
    () =>
      `${inventory.saleId}${inventory.saleSerialId ? `-${inventory.saleSerialId}` : ''}`,
    [inventory.saleId, inventory.saleSerialId],
  );

  return (
    <div className={cx(classes.itemCard, classes.fieldArrayItem)}>
      <div className={classes.titleWrapper}>
        <Typography variant="body-highlight" color="text-neutral-solid">
          {inventory.material.key}
        </Typography>
        <div className={classes.removeWrapper}>
          <Typography variant="caption" color="text-neutral">
            {saleInformation}
          </Typography>
          <Button
            type="button"
            icon={TrashIcon}
            iconType="icon-only"
            size="minor"
            variant="destructive-ghost"
            onClick={remove}
          />
        </div>
      </div>
      <div className={classes.fieldsWrapper}>
        <div style={{ width: 160 }}>
          <InputField
            name={`items.${index}.batchKey`}
            label="新批號"
            layout={FormFieldLayout.HORIZONTAL}
            placeholder="請輸入新批號"
          />
        </div>
        <div style={{ width: 214 }}>
          <NumberInputField
            name={`items.${index}.quantity`}
            label="拆出量"
            layout={FormFieldLayout.HORIZONTAL}
            placeholder="數量"
            suffix={currentUnitName}
          />
        </div>
      </div>
    </div>
  );
};

export default SplitBatchFieldArrayItem;
