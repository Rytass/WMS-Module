import { useMemo, useCallback } from 'react';
import { useFormContext, useWatch, get } from 'react-hook-form';
import { AutoComplete, SelectValue } from '@mezzanine-ui/react';
import type { AutoCompleteSingleProps } from '@mezzanine-ui/react/AutoComplete';
import BaseField, { BaseFieldProps } from '../BaseField';

export type SingleAutoCompleteFieldProps = AutoCompleteSingleProps &
  Omit<BaseFieldProps, 'children'> & {
    fuzzySearch?: boolean;
    useNameToValue?: boolean;
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

    if (fuzzySearch) {
      setValue(`${name}-search`, '', {
        shouldDirty: true,
      });
    }
  }, [name, setValue, fuzzySearch]);

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
        error={isError}
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
        keepSearchTextOnBlur
      />
    </BaseField>
  );
};

export default SingleAutoCompleteField;
