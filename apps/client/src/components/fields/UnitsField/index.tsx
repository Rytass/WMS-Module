import { TextFieldSize } from '@mezzanine-ui/react';
import SingleAutoCompleteField from '../SingleAutoCompleteField';
import SingleAutoCompleteByIdField from '../SingleAutoCompleteByIdField';
import { useInsertOption } from '../../../hooks/useSelectorOptions';
import { useQueryUnits } from './useApi';

interface UnitsFieldProps {
  name: string;
  label?: string;
  placeholder?: string;
  menuMaxHeight?: number;
  size?: TextFieldSize;
  required?: boolean;
  disabled?: boolean;
  selectValueMode?: boolean;
}

const UnitsField: FC<UnitsFieldProps> = ({
  name,
  label = '',
  placeholder,
  menuMaxHeight,
  size,
  required = false,
  disabled = false,
  selectValueMode = false,
}) => {
  const { currentOptions, setCurrentOptions } = useQueryUnits();
  const handleInsert = useInsertOption(setCurrentOptions);

  if (selectValueMode) {
    return (
      <SingleAutoCompleteField
        addable
        name={name}
        label={label}
        placeholder={placeholder}
        menuMaxHeight={menuMaxHeight}
        size={size}
        options={currentOptions}
        onInsert={handleInsert}
        required={required}
        disabled={disabled}
      />
    );
  }

  return (
    <SingleAutoCompleteByIdField
      addable
      name={name}
      label={label}
      placeholder={placeholder}
      menuMaxHeight={menuMaxHeight}
      size={size}
      options={currentOptions}
      onInsert={handleInsert}
      required={required}
      disabled={disabled}
      useNameToValue
    />
  );
};

export default UnitsField;
