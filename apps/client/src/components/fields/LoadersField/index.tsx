import { useCallback } from 'react';
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
  selectValueMode?: boolean;
}

const LoadersField: FC<LoadersFieldProps> = ({
  name,
  label = '載具',
  placeholder,
  fuzzySearch = true,
  required,
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

  if (selectValueMode) {
    return (
      <SingleAutoCompleteField
        name={name}
        label={label}
        placeholder={placeholder || `輸入${label}`}
        fuzzySearch={fuzzySearch}
        options={currentOptions}
        required={required}
        onVisibilityChange={onVisibilityChange}
        onSearch={onSearch}
        onReachBottom={onReachBottom}
      />
    );
  }

  return (
    <SingleAutoCompleteByIdField
      name={name}
      label={label}
      placeholder={placeholder || `輸入${label}`}
      fuzzySearch={fuzzySearch}
      options={currentOptions}
      required={required}
      onVisibilityChange={onVisibilityChange}
      useNameToValue
      onSearch={onSearch}
      onReachBottom={onReachBottom}
    />
  );
};

export default LoadersField;
