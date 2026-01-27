import { useCallback } from 'react';
import SingleAutoCompleteField from '../SingleAutoCompleteField';
import { MaterialOptionsQuery } from '../../../graphql/generated/.graphql';
import { useFetchMoreOptions } from '../../../hooks/useFetchOptions';
import { useLazyQueryMaterials } from './useApi';

interface MaterialsFieldProps {
  name: string;
  required?: boolean;
}

const MaterialsField: FC<MaterialsFieldProps> = ({ name, required }) => {
  const { fetchMaterials } = useLazyQueryMaterials();

  const getNewOptions = useCallback(
    (data: MaterialOptionsQuery | undefined) =>
      (data?.materials.items ?? []).map((i) => ({
        id: i.id,
        name: i.key,
      })),
    [],
  );

  const { currentOptions, onVisibilityChange, onReachBottom } =
    useFetchMoreOptions<MaterialOptionsQuery>({
      fetchData: fetchMaterials,
      getNewOptions,
    });

  return (
    <SingleAutoCompleteField
      name={name}
      label="料號"
      placeholder="輸入料號"
      fuzzySearch
      options={currentOptions}
      required={required}
      onVisibilityChange={onVisibilityChange}
      useNameToValue
      onReachBottom={onReachBottom}
    />
  );
};

export default MaterialsField;
