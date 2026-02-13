import { ChangeEventHandler, useCallback, useMemo } from 'react';
import { useFormContext, useWatch, get } from 'react-hook-form';
import { ControlFieldSlotLayout } from '@mezzanine-ui/core/form';
import Input from '@mezzanine-ui/react/Input';
import type { CurrencyInputProps } from '@mezzanine-ui/react/Input';
import BaseField, { BaseFieldProps } from '../BaseField';

export type NumberInputFieldProps = Omit<CurrencyInputProps, 'variant'> &
  Omit<BaseFieldProps, 'children'>;

export const NumberInputField: FC<NumberInputFieldProps> = ({
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
      layout={layout}
      controlFieldSlotLayout={
        size === 'sub'
          ? ControlFieldSlotLayout.SUB
          : ControlFieldSlotLayout.MAIN
      }
    >
      <Input
        fullWidth
        error={isError}
        className={className}
        variant="currency"
        value={`${watchValue}`}
        onChange={onChange}
        placeholder={placeholder}
        size={size}
        disabled={disabled ? true : undefined}
      />
    </BaseField>
  );
};

export default NumberInputField;
