import { ChangeEventHandler, useCallback, useMemo } from 'react';
import { useFormContext, useWatch, get } from 'react-hook-form';
import Input from '@mezzanine-ui/react/Input';
import type { UnitInputProps } from '@mezzanine-ui/react/Input';
import BaseField, { BaseFieldProps } from '../BaseField';

export type InputFieldProps = Omit<UnitInputProps, 'variant'> &
  Omit<BaseFieldProps, 'children'>;

export const InputField: FC<InputFieldProps> = ({
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
      setValue(name, Number(e.target.value), {
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
      <Input
        fullWidth
        error={isError}
        className={className}
        variant="unit"
        inputType="number"
        value={`${watchValue}`}
        onChange={onChange}
        placeholder={placeholder}
        size={size}
        disabled={disabled ? true : undefined}
      />
    </BaseField>
  );
};

export default InputField;
