import { useCallback } from 'react';
import SingleAutoCompleteField from '../SingleAutoCompleteField';
import SingleAutoCompleteByIdField from '../SingleAutoCompleteByIdField';
import { LocationOptionsQuery } from '../../../graphql/generated/.graphql';
import { useFetchMoreOptions } from '../../../hooks/useSelectorOptions';
import { useLazyQueryLocations } from './useApi';

interface LocationsFieldProps {
  name: string;
  label?: string;
  placeholder?: string;
  fuzzySearch?: boolean;
  required?: boolean;
  selectValueMode?: boolean;
}

const LocationsField: FC<LocationsFieldProps> = ({
  name,
  label = '儲存位置',
  placeholder,
  fuzzySearch = true,
  required,
  selectValueMode = false,
}) => {
  const { fetchLocations } = useLazyQueryLocations();

  const getNewOptions = useCallback(
    (data: LocationOptionsQuery | undefined) =>
      (data?.locations.items ?? []).map((i) => ({
        id: i.id,
        name: i.key,
      })),
    [],
  );

  const { currentOptions, onVisibilityChange, onSearch, onReachBottom } =
    useFetchMoreOptions<LocationOptionsQuery>({
      fetchData: fetchLocations,
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

export default LocationsField;
