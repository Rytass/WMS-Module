import { useCallback } from 'react';
import SingleAutoCompleteField from '../SingleAutoCompleteField';
import { LocationOptionsQuery } from '../../../graphql/generated/.graphql';
import { useFetchMoreOptions } from '../../../hooks/useSelectorOptions';
import { useLazyQueryLocations } from './useApi';

interface LocationsFieldProps {
  name: string;
  required?: boolean;
}

const LocationsField: FC<LocationsFieldProps> = ({ name, required }) => {
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

  return (
    <SingleAutoCompleteField
      name={name}
      label="儲存位置"
      placeholder="輸入儲存位置"
      fuzzySearch
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
