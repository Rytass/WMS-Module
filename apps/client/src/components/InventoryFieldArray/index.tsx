import { useFieldArray } from 'react-hook-form';
import { Typography } from '@mezzanine-ui/react';
import InventoryFormCard from './InventoryFormCard';
import { InventoryFieldArrayValues } from './typing';
import classes from './index.module.scss';

const InventoryFieldArray: FC = () => {
  const { fields } = useFieldArray<InventoryFieldArrayValues, 'stocks'>({
    name: 'stocks',
  });

  return (
    <div className={classes.host}>
      <Typography variant="label-primary" color="text-neutral-solid">
        {`已選項目 (${fields.length})`}
      </Typography>
      {fields.map((f, index) => (
        <InventoryFormCard key={f.id} index={index} />
      ))}
    </div>
  );
};

export default InventoryFieldArray;
