import { useFieldArray } from 'react-hook-form';
import { Typography, Button } from '@mezzanine-ui/react';
import InputField from '../../../fields/InputField';
import { SplitBatchFieldValues } from './typing';
import classes from './index.module.scss';

function SplitBatchField() {
  const { fields, append, remove } = useFieldArray<
    SplitBatchFieldValues,
    'items'
  >({
    name: 'items',
  });

  return (
    <div className={classes.host}>
      <div className={classes.titleWrapper}>
        <Typography variant="label-primary" color="text-neutral-solid">
          {`拆分結果（${fields.length}）`}
        </Typography>
        <div className={classes.actionsWrapper}>
          {fields.length > 0 && (
            <Button type="button" size="minor" variant="destructive-secondary">
              重置拆分結果
            </Button>
          )}
          <Button type="button" size="minor">
            新增拆批
          </Button>
        </div>
      </div>
      {fields.length > 0 ? null : (
        <Typography variant="body" color="text-neutral-solid">
          目前尚未新增拆分項目。
        </Typography>
      )}
    </div>
  );
}

export default SplitBatchField;
