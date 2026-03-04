import { useCallback } from 'react';
import SingleAutoCompleteField from '../SingleAutoCompleteField';
import { MaterialOptionsQuery } from '../../../graphql/generated/.graphql';
import { useFetchMoreOptions } from '../../../hooks/useSelectorOptions';
import { useLazyQueryMaterials } from './useApi';

interface MaterialsFieldProps {
  name: string;
  label?: string;
  placeholder?: string;
  fuzzySearch?: boolean;
  required?: boolean;
}

const MaterialsField: FC<MaterialsFieldProps> = ({
  name,
  label = '料號',
  placeholder,
  fuzzySearch = true,
  required,
}) => {
  const { fetchMaterials } = useLazyQueryMaterials();

  const getNewOptions = useCallback(
    (data: MaterialOptionsQuery | undefined) =>
      (data?.materials.items ?? []).map((i) => ({
        id: i.id,
        name: i.key,
      })),
    [],
  );

  const { currentOptions, onVisibilityChange, onSearch, onReachBottom } =
    useFetchMoreOptions<MaterialOptionsQuery>({
      fetchData: fetchMaterials,
      getNewOptions,
    });

  return (
    <SingleAutoCompleteField
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

export default MaterialsField;
