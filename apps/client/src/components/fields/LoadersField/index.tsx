import { useCallback, useMemo } from 'react';
import SingleAutoCompleteField from '../SingleAutoCompleteField';
import SingleAutoCompleteByIdField from '../SingleAutoCompleteByIdField';
import { LoaderOptionsQuery } from '../../../graphql/generated/.graphql';
import { useFetchMoreOptions } from '../../../hooks/useSelectorOptions';
import { useLazyQueryLoaders } from './useApi';

interface LoadersFieldProps {
  name: string;
  label?: string;
  placeholder?: string;
  fuzzySearch?: boolean;
  required?: boolean;
  disabled?: boolean;
  selectValueMode?: boolean;
}

const LoadersField: FC<LoadersFieldProps> = ({
  name,
  label = '載具',
  placeholder,
  fuzzySearch = true,
  required,
  disabled,
  selectValueMode = false,
}) => {
  const { fetchLoaders } = useLazyQueryLoaders();

  const getNewOptions = useCallback(
    (data: LoaderOptionsQuery | undefined) =>
      (data?.loaders.items ?? []).map((i) => ({
        id: i.id,
        name: i.serialId,
      })),
    [],
  );

  const { currentOptions, onVisibilityChange, onSearch, onReachBottom } =
    useFetchMoreOptions<LoaderOptionsQuery>({
      fetchData: fetchLoaders,
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

export default LoadersField;
