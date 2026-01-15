import { useCallback } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { DatePicker, DatePickerProps } from '@mezzanine-ui/react';
import BaseField, { BaseFieldProps } from '../BaseField';

export type DateFieldProps = DatePickerProps & Omit<BaseFieldProps, 'children'>;

export const DateField: FC<DateFieldProps> = ({
  className,
  fieldClassName,
  name,
  label,
  hint,
  fieldSize,
  required = false,
  disabled = false,
  placeholder,
  size = 'sub',
}) => {
  const { setValue } = useFormContext();

  const watchValue = useWatch({
    name,
  });

  const onChange = useCallback(
    (target: string | undefined) => {
      setValue(name, target, {
        shouldDirty: true,
      });
    },
    [name, setValue],
  );

  return (
    <BaseField
      fieldClassName={fieldClassName}
      name={name}
      required={required}
      disabled={disabled}
      label={label}
      hint={hint}
      fieldSize={fieldSize}
    >
      <DatePicker
        clearable
        className={className}
        size={size}
        placeholder={placeholder}
        disabled={disabled}
        value={watchValue}
        onChange={onChange}
      />
    </BaseField>
  );
};

export default DateField;
