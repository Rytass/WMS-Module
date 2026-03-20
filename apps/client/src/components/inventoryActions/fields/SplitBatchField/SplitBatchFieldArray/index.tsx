import { useMemo } from 'react';
import {
  FieldArrayWithId,
  UseFieldArrayUpdate,
  UseFieldArrayRemove,
  useWatch,
} from 'react-hook-form';
import { AggregatedStockFragment } from '../../../../../graphql/generated/.graphql';
import { useInventorySignature } from '../../../useInventoryActions';
import SplitBatchReference from './SplitBatchReference';
import SplitBatchFieldArrayItem from './SplitBatchFieldArrayItem';
import { SplitBatchFieldValues } from '../typing';

interface SplitBatchFieldArrayProps {
  fields: FieldArrayWithId<SplitBatchFieldValues, 'items', 'id'>[];
  update: UseFieldArrayUpdate<SplitBatchFieldValues, 'items'>;
  remove: UseFieldArrayRemove;
  inventory: AggregatedStockFragment;
}

const SplitBatchFieldArray: FC<SplitBatchFieldArrayProps> = ({
  fields,
  update,
  remove,
  inventory,
}) => {
  const { quantity } = useInventorySignature(inventory);
  const items = useWatch<SplitBatchFieldValues, 'items'>({ name: 'items' });

  const splitQuantity = useMemo(
    () => items.reduce((prev, curr) => prev + curr.quantity, 0),
    [items],
  );
  const remainingQuantity = useMemo(
    () => quantity - splitQuantity,
    [quantity, splitQuantity],
  );

  return (
    <>
      <SplitBatchReference
        inventory={inventory}
        remainingQuantity={remainingQuantity}
      />
      {fields.map((field, index) => (
        <SplitBatchFieldArrayItem
          key={field.id}
          field={field}
          index={index}
          update={update}
          remove={() => {
            remove(index);
          }}
          inventory={inventory}
        />
      ))}
    </>
  );
};

export default SplitBatchFieldArray;
