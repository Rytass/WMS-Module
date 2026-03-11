import { TextFieldSize } from '@mezzanine-ui/react';
import SingleAutoCompleteField from '../SingleAutoCompleteField';
import SingleAutoCompleteByIdField from '../SingleAutoCompleteByIdField';
import { useQueryLoaderUnits } from './useApi';
import { LoaderUnit } from '../../../graphql/generated/.graphql';

interface LoaderUnitsFieldProps {
  type: LoaderUnit;
  name: string;
  label?: string;
  placeholder?: string;
  menuMaxHeight?: number;
  size?: TextFieldSize;
  required?: boolean;
  disabled?: boolean;
  selectValueMode?: boolean;
}

const LoaderUnitsField: FC<LoaderUnitsFieldProps> = ({
  type,
  name,
  label = '',
  placeholder,
  menuMaxHeight,
  size,
  required = false,
  disabled = false,
  selectValueMode = false,
}) => {
  const { currentOptions } = useQueryLoaderUnits(type);

  if (selectValueMode) {
    return (
      <SingleAutoCompleteField
        name={name}
        label={label}
        placeholder={placeholder}
        menuMaxHeight={menuMaxHeight}
        size={size}
        options={currentOptions}
        required={required}
        disabled={disabled}
      />
    );
  }

  return (
    <SingleAutoCompleteByIdField
      name={name}
      label={label}
      placeholder={placeholder}
      menuMaxHeight={menuMaxHeight}
      size={size}
      options={currentOptions}
      required={required}
      disabled={disabled}
      useNameToValue
    />
  );
};

export default LoaderUnitsField;
