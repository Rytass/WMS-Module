import {
  useMemo,
  useCallback,
  useRef,
  Dispatch,
  SetStateAction,
  useEffect,
  MouseEvent,
} from 'react';
import { useFormContext, useWatch, get } from 'react-hook-form';
import { ControlFieldSlotLayout } from '@mezzanine-ui/core/form';
import { AutoComplete, SelectValue } from '@mezzanine-ui/react';
import type { AutoCompleteSingleProps } from '@mezzanine-ui/react/AutoComplete';
import { usePreviousValue } from '../../../hooks/usePreviousValue';
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
  layout,
  required = false,
  disabled = false,
  placeholder,
  size = 'sub',
  menuMaxHeight = 300,
  options,
  onSearch: onSearchProps,
  onChange: onChangeProps,
  onClear: onClearProps,
  fuzzySearch = false,
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

  const prevWatchValue = usePreviousValue(watchValue);

  useEffect(() => {
    if ((prevWatchValue && !watchValue) || (fuzzySearch && !searchValue)) {
      searchTextControlRef.current?.setSearchText('');
    }
  }, [fuzzySearch, searchValue, prevWatchValue, watchValue]);

  const onChange = useCallback(
    (newValue: SelectValue) => {
      if (errors?.[name]) {
        clearErrors(name);
      }

      onChangeProps?.(newValue);

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
    [clearErrors, onChangeProps, errors, name, setValue],
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

  const onClear = useCallback(
    (e: MouseEvent<Element, globalThis.MouseEvent>) => {
      onClearProps?.(e);

      setValue(name, null, {
        shouldDirty: true,
      });

      if (fuzzySearch) {
        setValue(`${name}-search`, '', {
          shouldDirty: true,
        });
      }
    },
    [name, setValue, onClearProps, fuzzySearch],
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
        value={watchValue ?? null}
        options={options}
        menuMaxHeight={menuMaxHeight}
        clearSearchText={false}
      />
    </BaseField>
  );
};

export default SingleAutoCompleteField;
