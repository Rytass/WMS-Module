import { FieldArrayWithId, UseFieldArrayUpdate } from 'react-hook-form';
import { Typography, Button, cx } from '@mezzanine-ui/react';
import { FormFieldLayout } from '@mezzanine-ui/core/form';
import { TrashIcon } from '@mezzanine-ui/icons';
import { AggregatedStockFragment } from '../../../../../graphql/generated/.graphql';
import { useInventorySignature } from '../../../useInventoryActions';
import InputField from '../../../../fields/InputField';
import NumberInputField from '../../../../fields/NumberInputField';
import { SplitBatchFieldValues } from '../typing';
import classes from './index.module.scss';

interface SplitBatchFieldArrayItemProps {
  index: number;
  field: FieldArrayWithId<SplitBatchFieldValues, 'items', 'id'>;
  update: UseFieldArrayUpdate<SplitBatchFieldValues, 'items'>;
  remove: VoidFunction;
  inventory: AggregatedStockFragment;
}

const SplitBatchFieldArrayItem: FC<SplitBatchFieldArrayItemProps> = ({
  index,
  field,
  update,
  remove,
  inventory,
}) => {
  const { saleInformation, currentUnitName } = useInventorySignature(inventory);

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
            onChange={(e) => {
              update(index, {
                ...field,
                quantity: Number(e.target.value),
              });
            }}
            placeholder="數量"
            suffix={currentUnitName}
          />
        </div>
      </div>
    </div>
  );
};

export default SplitBatchFieldArrayItem;
