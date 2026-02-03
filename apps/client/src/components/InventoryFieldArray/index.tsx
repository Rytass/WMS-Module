import { useFieldArray } from 'react-hook-form';
import InventoryFormCard from './InventoryFormCard';
import { InventoryFieldArrayValues } from './typing';

const InventoryFieldArray: FC = () => {
  const { fields } = useFieldArray<InventoryFieldArrayValues, 'stocks'>({
    name: 'stocks',
  });

  return fields.map((f, index) => (
    <InventoryFormCard key={f.id} index={index} />
  ));
};

export default InventoryFieldArray;
