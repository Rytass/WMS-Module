import { ChangeEventHandler, useCallback, useMemo } from 'react';
import { useFormContext, useWatch, get } from 'react-hook-form';
import Input from '@mezzanine-ui/react/Input';
import { ControlFieldSlotLayout } from '@mezzanine-ui/core/form';
import type { SelectInputProps } from '@mezzanine-ui/react/Input';
import BaseField, { BaseFieldProps } from '../BaseField';

export type SelectInputFieldProps = Omit<
  SelectInputProps,
  'variant' | 'selectButton'
> &
  Omit<BaseFieldProps, 'children'> & {
    selectName: string;
  };

export const SelectInputField: FC<SelectInputFieldProps> = ({
  className,
  fieldClassName,
  name,
  selectName,
  label,
  hint,
  layout,
  required = false,
  disabled = false,
  placeholder,
  inputType,
  options,
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

  const selectedValue = useWatch({
    name: selectName,
  });

  const selectedName = useMemo(
    () => options?.find((o) => o.id === selectedValue)?.name ?? '',
    [options, selectedValue],
  );

  const onChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      setValue(name, e.target.value, {
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
        variant="select"
        value={watchValue}
        onChange={onChange}
        onSelect={(value) => {
          setValue(selectName, value, {
            shouldDirty: true,
          });
        }}
        placeholder={placeholder}
        size={size}
        selectedValue={selectedValue}
        selectButton={{
          position: 'suffix',
          value: selectedName,
        }}
        options={options}
        inputType={inputType}
        inputProps={{
          style: {
            textAlign: 'right',
          },
        }}
        disabled={disabled ? true : undefined}
      />
    </BaseField>
  );
};

export default SelectInputField;
