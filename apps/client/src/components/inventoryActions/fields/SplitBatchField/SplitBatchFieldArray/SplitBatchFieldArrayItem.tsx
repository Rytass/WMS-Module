import { Typography, Button } from '@mezzanine-ui/react';
import { FormFieldLayout } from '@mezzanine-ui/core/form';
import { TrashIcon } from '@mezzanine-ui/icons';
import InputField from '../../../../fields/InputField';
import NumberInputField from '../../../../fields/NumberInputField';
import classes from './index.module.scss';

interface SplitBatchFieldArrayItemProps {
  index: number;
}

const SplitBatchFieldArrayItem: FC<SplitBatchFieldArrayItemProps> = ({
  index,
}) => {
  return (
    <div className={classes.fieldArrayItem}>
      <div className={classes.titleWrapper}>
        <Typography variant="body-highlight" color="text-neutral-solid">
          BlackTea
        </Typography>
        <div className={classes.removeWrapper}>
          <Typography variant="caption" color="text-neutral">
            Sale123-456
          </Typography>
          <Button
            type="button"
            icon={TrashIcon}
            iconType="icon-only"
            size="minor"
            variant="destructive-ghost"
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
          />
        </div>
      </div>
    </div>
  );
};

export default SplitBatchFieldArrayItem;
