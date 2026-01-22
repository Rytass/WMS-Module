import { useMemo, useCallback } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { AutoComplete, SelectValue } from '@mezzanine-ui/react';
import type { AutoCompleteSingleProps } from '@mezzanine-ui/react/AutoComplete';
import BaseField, { BaseFieldProps } from '../BaseField';

export type SingleAutoCompleteFieldProps = AutoCompleteSingleProps &
  Omit<BaseFieldProps, 'children'> & {
    fuzzySearch?: boolean;
  };

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
  onSearch: onSearchProps,
  fuzzySearch = false,
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

  const onSearch = useCallback(
    (input: string) => {
      onSearchProps?.(input);

      if (fuzzySearch) {
        setValue(`${name}-search`, input, {
          shouldDirty: true,
        });
      }
    },
    [fuzzySearch, name, onSearchProps, setValue],
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
      <AutoComplete
        {...rest}
        className={className}
        size={size}
        placeholder={placeholder}
        fullWidth
        mode="single"
        onSearch={onSearch}
        onChange={onChange}
        onClear={onClear}
        value={watchValueInOptions}
        options={options}
        menuMaxHeight={370}
      />
    </BaseField>
  );
};

export default SingleAutoCompleteField;
