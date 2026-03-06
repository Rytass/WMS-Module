import { useMemo, useCallback } from 'react';
import SingleAutoCompleteField from '../SingleAutoCompleteField';
import SingleAutoCompleteByIdField from '../SingleAutoCompleteByIdField';
import { LoaderTypeOptionsQuery } from '../../../graphql/generated/.graphql';
import { useFetchMoreOptions } from '../../../hooks/useSelectorOptions';
import { useLazyQueryLoaderTypes } from './useApi';

interface LoaderTypesFieldProps {
  name: string;
  label?: string;
  placeholder?: string;
  fuzzySearch?: boolean;
  required?: boolean;
  disabled?: boolean;
  selectValueMode?: boolean;
}

const LoaderTypesField: FC<LoaderTypesFieldProps> = ({
  name,
  label = '載具類型',
  placeholder,
  fuzzySearch = true,
  required,
  disabled,
  selectValueMode = false,
}) => {
  const { fetchLoaderTypes } = useLazyQueryLoaderTypes();

  const getNewOptions = useCallback(
    (data: LoaderTypeOptionsQuery | undefined) =>
      (data?.loaderTypes.items ?? []).map((i) => ({
        id: i.id,
        name: i.description,
      })),
    [],
  );

  const { currentOptions, onVisibilityChange, onSearch, onReachBottom } =
    useFetchMoreOptions<LoaderTypeOptionsQuery>({
      fetchData: fetchLoaderTypes,
      getNewOptions,
    });

  const baseProps = useMemo(
    () => ({
      name,
      label,
      placeholder: placeholder || `輸入${label}`,
      fuzzySearch,
      options: currentOptions,
      required,
      disabled,
      onVisibilityChange,
      onSearch,
      onReachBottom,
    }),
    [
      currentOptions,
      disabled,
      fuzzySearch,
      label,
      name,
      onReachBottom,
      onSearch,
      onVisibilityChange,
      placeholder,
      required,
    ],
  );

  if (selectValueMode) {
    return <SingleAutoCompleteField {...baseProps} />;
  }

  return <SingleAutoCompleteByIdField {...baseProps} useNameToValue />;
};

export default LoaderTypesField;
