import { TextFieldSize } from '@mezzanine-ui/react';
import SingleSelectByIdField from '../SingleSelectByIdField';
import { YesOrNo, yesNoOptions } from '../../../utils/share';

interface YesNoFieldProps {
  name: string;
  label?: string;
  placeholder?: string;
  menuMaxHeight?: number;
  size?: TextFieldSize;
  required?: boolean;
  clearable?: boolean;
  disabled?: boolean;
  customizeOptions?: {
    yesName: string;
    noName: string;
  };
}

const YesNoField: FC<YesNoFieldProps> = ({
  name,
  label = '',
  placeholder,
  menuMaxHeight,
  size,
  required = false,
  clearable = false,
  disabled = false,
  customizeOptions,
}) => {
  return (
    <SingleSelectByIdField
      name={name}
      label={label}
      placeholder={placeholder}
      menuMaxHeight={menuMaxHeight}
      size={size}
      clearable={clearable}
      options={
        customizeOptions
          ? [
              {
                id: YesOrNo.YES,
                name: customizeOptions.yesName,
              },
              {
                id: YesOrNo.NO,
                name: customizeOptions.noName,
              },
            ]
          : yesNoOptions
      }
      required={required}
      disabled={disabled}
    />
  );
};

export default YesNoField;
