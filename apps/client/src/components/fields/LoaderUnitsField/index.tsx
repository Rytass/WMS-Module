import { TextFieldSize } from '@mezzanine-ui/react';
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
}) => {
  const { currentOptions } = useQueryLoaderUnits(type);

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
