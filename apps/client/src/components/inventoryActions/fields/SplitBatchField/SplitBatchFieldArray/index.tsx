import { FieldArrayWithId, UseFieldArrayRemove } from 'react-hook-form';
import { AggregatedStockFragment } from '../../../../../graphql/generated/.graphql';
import SplitBatchFieldArrayItem from './SplitBatchFieldArrayItem';
import { SplitBatchFieldValues } from '../typing';

interface SplitBatchFieldArrayProps {
  fields: FieldArrayWithId<SplitBatchFieldValues, 'items', 'id'>[];
  remove: UseFieldArrayRemove;
  inventory?: AggregatedStockFragment;
}

const SplitBatchFieldArray: FC<SplitBatchFieldArrayProps> = ({
  fields,
  remove,
  inventory,
}) => {
  if (!inventory) return null;

  return (
    <>
      {fields.map((f, index) => (
        <SplitBatchFieldArrayItem
          key={f.id}
          index={index}
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
