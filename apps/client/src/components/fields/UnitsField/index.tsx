import { useCallback } from 'react';
import SingleAutoCompleteField from '../SingleAutoCompleteField';
import { useQueryUnits } from './useApi';
import { SelectValue } from '@mezzanine-ui/react';

interface UnitsFieldProps {
  name: string;
  label?: string;
  placeholder?: string;
  menuMaxHeight?: number;
  required?: boolean;
}

const UnitsField: FC<UnitsFieldProps> = ({
  name,
  label = '',
  placeholder,
  menuMaxHeight,
  required,
}) => {
  const { currentOptions, setCurrentOptions } = useQueryUnits();

  const handleInsert = useCallback(
    (text: string, cOptions: SelectValue[]): SelectValue[] => {
      const newOption: SelectValue = {
        id: text,
        name: text,
      };
      const updatedOptions = [...cOptions, newOption];

      setCurrentOptions((prev) => [...prev, newOption]);

      return updatedOptions;
    },
    [setCurrentOptions],
  );

  return (
    <SingleAutoCompleteField
      addable
      name={name}
      label={label}
      placeholder={placeholder}
      menuMaxHeight={menuMaxHeight}
      options={currentOptions}
      onInsert={handleInsert}
      required={required}
      useNameToValue
    />
  );
};

export default UnitsField;
