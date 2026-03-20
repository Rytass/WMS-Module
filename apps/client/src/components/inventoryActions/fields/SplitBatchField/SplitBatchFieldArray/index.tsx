import { useMemo } from 'react';
import {
  FieldArrayWithId,
  UseFieldArrayUpdate,
  UseFieldArrayRemove,
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

  const splitQuantity = useMemo(
    () => fields.reduce((prev, curr) => prev + curr.quantity, 0),
    [fields],
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
