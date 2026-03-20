import { useCallback } from 'react';
import { useFieldArray } from 'react-hook-form';
import { Typography, Button } from '@mezzanine-ui/react';
import SplitBatchFieldArray from './SplitBatchFieldArray';
import { AggregatedStockFragment } from '../../../../graphql/generated/.graphql';
import { SplitBatchFieldValues } from './typing';
import classes from './index.module.scss';

interface SplitBatchFieldProps {
  inventory?: AggregatedStockFragment;
}

function SplitBatchField({ inventory }: SplitBatchFieldProps) {
  const { fields, append, replace, remove } = useFieldArray<
    SplitBatchFieldValues,
    'items'
  >({
    name: 'items',
  });

  const onAppend = useCallback(() => {
    append({
      batchKey: '',
      quantity: 0,
    });
  }, [append]);

  const onReset = useCallback(() => {
    replace([]);
  }, [replace]);

  return (
    <div className={classes.host}>
      <div className={classes.titleWrapper}>
        <Typography variant="label-primary" color="text-neutral-solid">
          {`拆分結果（${fields.length}）`}
        </Typography>
        <div className={classes.actionsWrapper}>
          {fields.length > 0 && (
            <Button
              type="button"
              size="minor"
              variant="destructive-secondary"
              onClick={onReset}
            >
              重置拆分結果
            </Button>
          )}
          <Button type="button" size="minor" onClick={onAppend}>
            新增拆批
          </Button>
        </div>
      </div>
      {fields.length > 0 && inventory ? (
        <SplitBatchFieldArray
          fields={fields}
          remove={remove}
          inventory={inventory}
        />
      ) : (
        <Typography variant="body" color="text-neutral-solid">
          目前尚未新增拆分項目。
        </Typography>
      )}
    </div>
  );
}

export default SplitBatchField;
