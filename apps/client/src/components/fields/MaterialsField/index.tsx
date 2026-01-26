import { useLazyQuery } from '@apollo/client/react';
import SingleAutoCompleteField from '../SingleAutoCompleteField';
import {
  MaterialOptionsDocument,
  MaterialOptionsQuery,
} from '../../../graphql/generated/.graphql';
import { useFetchAllOptions } from '../../../hooks/useFetchAllOptions';
import { useCallback } from 'react';

interface MaterialsFieldProps {
  name: string;
}

const MaterialsField: FC<MaterialsFieldProps> = ({ name }) => {
  const [fetchMaterials] = useLazyQuery(MaterialOptionsDocument);

  const getNewOptions = useCallback(
    (data: MaterialOptionsQuery | undefined) =>
      (data?.materials.items ?? []).map((i) => ({
        id: i.id,
        name: i.key,
      })),
    [],
  );

  const { currentOptions, onVisibilityChange } =
    useFetchAllOptions<MaterialOptionsQuery>({
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
      onVisibilityChange={onVisibilityChange}
    />
  );
};

export default MaterialsField;
