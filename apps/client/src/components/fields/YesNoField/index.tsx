import { TextFieldSize } from '@mezzanine-ui/react';
import SingleSelectField from '../SingleSelectField';
import { yesNoOptions } from '../../../utils/share';

interface YesNoFieldProps {
  name: string;
  label?: string;
  placeholder?: string;
  menuMaxHeight?: number;
  size?: TextFieldSize;
  required?: boolean;
  disabled?: boolean;
}

const YesNoField: FC<YesNoFieldProps> = ({
  name,
  label = '',
  placeholder,
  menuMaxHeight,
  size,
  required = false,
  disabled = false,
}) => {
  return (
    <SingleSelectField
      name={name}
      label={label}
      placeholder={placeholder}
      menuMaxHeight={menuMaxHeight}
      size={size}
      options={yesNoOptions}
      required={required}
      disabled={disabled}
    />
  );
};

export default YesNoField;
