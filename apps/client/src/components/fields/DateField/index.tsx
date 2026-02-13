import { useCallback, useMemo } from 'react';
import { useFormContext, useWatch, get } from 'react-hook-form';
import { DatePicker, DatePickerProps } from '@mezzanine-ui/react';
import { ControlFieldSlotLayout } from '@mezzanine-ui/core/form';
import BaseField, { BaseFieldProps } from '../BaseField';

export type DateFieldProps = DatePickerProps & Omit<BaseFieldProps, 'children'>;

export const DateField: FC<DateFieldProps> = ({
  className,
  fieldClassName,
  name,
  label,
  hint,
  layout,
  required = false,
  disabled = false,
  placeholder,
  size = 'sub',
}) => {
  const { setValue, formState } = useFormContext();

  const isError = useMemo(
    () => get(formState.errors, name),
    [formState.errors, name],
  );

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
      layout={layout}
      controlFieldSlotLayout={
        size === 'sub'
          ? ControlFieldSlotLayout.SUB
          : ControlFieldSlotLayout.MAIN
      }
    >
      <DatePicker
        clearable
        error={isError}
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
