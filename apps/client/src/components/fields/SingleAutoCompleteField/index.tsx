import { useMemo, useCallback } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { AutoComplete, SelectValue } from '@mezzanine-ui/react';
import type { AutoCompleteSingleProps } from '@mezzanine-ui/react/AutoComplete';
import BaseField, { BaseFieldProps } from '../BaseField';

export type SingleAutoCompleteFieldProps = AutoCompleteSingleProps &
  Omit<BaseFieldProps, 'children'>;

export const SingleAutoCompleteField: FC<SingleAutoCompleteFieldProps> = ({
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
  options,
  ...rest
}) => {
  const {
    clearErrors,
    formState: { errors },
    setValue,
  } = useFormContext();

  const watchValue = useWatch({
    name,
  });

  const watchValueInOptions = useMemo(
    () => options?.find((o) => o.id === watchValue) ?? null,
    [options, watchValue],
  );

  const onChange = (newValue: SelectValue) => {
    if (errors?.[name]) {
      clearErrors(name);
    }

    if (newValue) {
      setValue(name, newValue.id, {
        shouldDirty: true,
      });
    } else {
      setValue(name, '', {
        shouldDirty: true,
      });
    }
  };

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
      <AutoComplete
        {...rest}
        className={className}
        size={size}
        placeholder={placeholder}
        mode="single"
        onChange={onChange}
        onClear={onClear}
        value={watchValueInOptions}
        options={options}
      />
    </BaseField>
  );
};

export default SingleAutoCompleteField;
