import { useMemo, useCallback } from 'react';
import { useFormContext, useWatch, get } from 'react-hook-form';
import { ControlFieldSlotLayout } from '@mezzanine-ui/core/form';
import { Select, SelectValue } from '@mezzanine-ui/react';
import type { SelectSingleProps } from '@mezzanine-ui/react/Select/Select';
import BaseField, { BaseFieldProps } from '../BaseField';

export type SingleSelectFieldProps = SelectSingleProps &
  Omit<BaseFieldProps, 'children'>;

export const SingleSelectField: FC<SingleSelectFieldProps> = ({
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
  menuMaxHeight = 300,
  options,
  ...rest
}) => {
  const {
    clearErrors,
    formState: { errors },
    setValue,
  } = useFormContext();

  const isError = useMemo(() => get(errors, name), [errors, name]);

  const watchValue = useWatch({
    name,
  });

  const onChange = useCallback(
    (newValue: SelectValue) => {
      if (errors?.[name]) {
        clearErrors(name);
      }

      if (newValue) {
        setValue(name, newValue, {
          shouldDirty: true,
        });
      } else {
        setValue(name, null, {
          shouldDirty: true,
        });
      }
    },
    [clearErrors, errors, name, setValue],
  );

  const onClear = useCallback(() => {
    setValue(name, null, {
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
      <Select
        {...rest}
        error={isError}
        className={className}
        size={size}
        placeholder={placeholder}
        fullWidth
        mode="single"
        onChange={onChange}
        onClear={onClear}
        value={watchValue}
        options={options}
        menuMaxHeight={menuMaxHeight}
        dropdownZIndex={1004}
      />
    </BaseField>
  );
};

export default SingleSelectField;
