import { useMemo } from 'react';
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
  selectValueMode: boolean;
}

const UnitsField: FC<UnitsFieldProps> = ({
  name,
  label = '',
  placeholder,
  menuMaxHeight,
  size,
  required = false,
  disabled = false,
  selectValueMode,
}) => {
  const { currentOptions, setCurrentOptions } = useQueryUnits();
  const handleInsert = useInsertOption(setCurrentOptions);

  const baseProps = useMemo(
    () => ({
      addable: true,
      name,
      label,
      placeholder,
      menuMaxHeight,
      size,
      options: currentOptions,
      onInsert: handleInsert,
      required,
      disabled,
    }),
    [
      currentOptions,
      disabled,
      handleInsert,
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

export default UnitsField;
