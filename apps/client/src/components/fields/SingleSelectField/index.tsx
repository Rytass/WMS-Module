import { useMemo, useCallback } from 'react';
import { useFormContext, useWatch, get } from 'react-hook-form';
import { Select, SelectValue } from '@mezzanine-ui/react';
import type { SelectSingleProps } from '@mezzanine-ui/react/Select/Select';
import BaseField, { BaseFieldProps } from '../BaseField';

export type SingleSelectFieldProps = SelectSingleProps &
  Omit<BaseFieldProps, 'children'> & {
    useNameToValue?: boolean;
  };

export const SingleSelectField: FC<SingleSelectFieldProps> = ({
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
  menuMaxHeight = 300,
  options,
  useNameToValue = false,
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

  const watchValueInOptions = useMemo(
    () =>
      options?.find((o) =>
        useNameToValue ? o.name === watchValue : o.id === watchValue,
      ) ?? null,
    [options, watchValue, useNameToValue],
  );

  const onChange = useCallback(
    (newValue: SelectValue) => {
      if (errors?.[name]) {
        clearErrors(name);
      }

      if (newValue) {
        setValue(name, useNameToValue ? newValue.name : newValue.id, {
          shouldDirty: true,
        });
      } else {
        setValue(name, '', {
          shouldDirty: true,
        });
      }
    },
    [clearErrors, errors, name, setValue, useNameToValue],
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
      fieldSize={fieldSize}
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
        value={watchValueInOptions}
        options={options}
        menuMaxHeight={menuMaxHeight}
      />
    </BaseField>
  );
};

export default SingleSelectField;
