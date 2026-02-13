import { ChangeEventHandler, useCallback, useMemo } from 'react';
import { useFormContext, useWatch, get } from 'react-hook-form';
import Input from '@mezzanine-ui/react/Input';
import { ControlFieldSlotLayout } from '@mezzanine-ui/core/form';
import type { BaseInputProps } from '@mezzanine-ui/react/Input';
import BaseField, { BaseFieldProps } from '../BaseField';

export type InputFieldProps = BaseInputProps & Omit<BaseFieldProps, 'children'>;

export const InputField: FC<InputFieldProps> = ({
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

  const onChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      setValue(name, e.target.value, {
        shouldDirty: true,
      });
    },
    [name, setValue],
  );

  const onClear = useCallback(() => {
    setValue(name, '', {
      shouldDirty: true,
    });
  }, [name, setValue]);

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
      <Input
        fullWidth
        clearable
        error={isError}
        className={className}
        variant="base"
        value={watchValue}
        onChange={onChange}
        onClear={onClear}
        placeholder={placeholder}
        size={size}
        disabled={disabled ? true : undefined}
      />
    </BaseField>
  );
};

export default InputField;
