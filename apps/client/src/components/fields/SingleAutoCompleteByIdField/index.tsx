import {
  useMemo,
  useCallback,
  useRef,
  Dispatch,
  SetStateAction,
  useEffect,
} from 'react';
import { useFormContext, useWatch, get } from 'react-hook-form';
import { ControlFieldSlotLayout } from '@mezzanine-ui/core/form';
import { AutoComplete, SelectValue } from '@mezzanine-ui/react';
import type { AutoCompleteSingleProps } from '@mezzanine-ui/react/AutoComplete';
import { usePreviousValue } from '../../../hooks/usePreviousValue';
import BaseField, { BaseFieldProps } from '../BaseField';

export type SingleAutoCompleteByIdFieldProps = AutoCompleteSingleProps &
  Omit<BaseFieldProps, 'children'> & {
    fuzzySearch?: boolean;
    useNameToValue?: boolean;
  };

export const SingleAutoCompleteByIdField: FC<
  SingleAutoCompleteByIdFieldProps
> = ({
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

  const searchTextControlRef = useRef<
    | { reset: () => void; setSearchText: Dispatch<SetStateAction<string>> }
    | undefined
  >(undefined);

  const isError = useMemo(() => get(errors, name), [errors, name]);

  const watchValue = useWatch({
    name,
  });

  const searchValue = useWatch({
    name: `${name}-search`,
  });

  const watchValueInOptions = useMemo(
    () =>
      options?.find((o) =>
        useNameToValue ? o.name === watchValue : o.id === watchValue,
      ) ?? null,
    [options, watchValue, useNameToValue],
  );

  // const watchValueInOptions = useMemo(() => {
  //   const target =
  //     options?.find((o) =>
  //       useNameToValue ? o.name === watchValue : o.id === watchValue,
  //     ) ?? null;

  //   if (useNameToValue && watchValue && !target) {
  //     return {
  //       id: watchValue,
  //       name: watchValue,
  //     };
  //   }

  //   return target;
  // }, [options, watchValue, useNameToValue]);

  const prevWatchValueInOptions = usePreviousValue(watchValueInOptions);

  useEffect(() => {
    if (
      (prevWatchValueInOptions && !watchValueInOptions) ||
      (fuzzySearch && !searchValue)
    ) {
      searchTextControlRef.current?.setSearchText('');
    }
  }, [fuzzySearch, searchValue, prevWatchValueInOptions, watchValueInOptions]);

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
      layout={layout}
      controlFieldSlotLayout={
        size === 'sub'
          ? ControlFieldSlotLayout.SUB
          : ControlFieldSlotLayout.MAIN
      }
    >
      <AutoComplete
        {...rest}
        searchTextControlRef={searchTextControlRef}
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
        menuMaxHeight={menuMaxHeight}
        clearSearchText={false}
        dropdownZIndex={1004}
      />
    </BaseField>
  );
};

export default SingleAutoCompleteByIdField;
