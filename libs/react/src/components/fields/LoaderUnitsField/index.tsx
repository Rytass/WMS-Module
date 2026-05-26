import { useMemo } from 'react';
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
  selectValueMode: boolean;
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
  selectValueMode,
}) => {
  const { currentOptions } = useQueryLoaderUnits(type);

  const baseProps = useMemo(
    () => ({
      name,
      label,
      placeholder,
      menuMaxHeight,
      size,
      options: currentOptions,
      required,
      disabled,
    }),
    [
      currentOptions,
      disabled,
      label,
      menuMaxHeight,
      name,
      placeholder,
      required,
      size,
    ],
  );

  if (selectValueMode) {
    return <SingleAutoCompleteField {...baseProps} />;
  }

  return <SingleAutoCompleteByIdField {...baseProps} useNameToValue />;
};

export default LoaderUnitsField;
