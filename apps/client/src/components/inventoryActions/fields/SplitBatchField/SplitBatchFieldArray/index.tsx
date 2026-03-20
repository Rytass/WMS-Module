import { FieldArrayWithId } from 'react-hook-form';
import SplitBatchFieldArrayItem from './SplitBatchFieldArrayItem';
import { SplitBatchFieldValues } from '../typing';

interface SplitBatchFieldArrayProps {
  fields: FieldArrayWithId<SplitBatchFieldValues, 'items', 'id'>[];
}

const SplitBatchFieldArray: FC<SplitBatchFieldArrayProps> = ({ fields }) => {
  return (
    <>
      {fields.map((f, index) => (
        <SplitBatchFieldArrayItem key={f.id} index={index} />
      ))}
    </>
  );
};

export default SplitBatchFieldArray;
