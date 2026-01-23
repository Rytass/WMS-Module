import { useCallback, useEffect, useState } from 'react';
import { useLazyQuery } from '@apollo/client/react';
import { SelectValue } from '@mezzanine-ui/react';
import SingleAutoCompleteField from '../SingleAutoCompleteField';
import { MaterialOptionsDocument } from '../../../graphql/generated/.graphql';

interface MaterialsFieldProps {
  name: string;
}

const MaterialsField: FC<MaterialsFieldProps> = ({ name }) => {
  const [page, setPage] = useState<number>(0);
  const [currentOptions, setOptions] = useState<SelectValue[]>([]);
  const [fetchMaterials] = useLazyQuery(MaterialOptionsDocument);

  const fetch = useCallback(async () => {
    try {
      const { data } = await fetchMaterials({
        variables: {
          limit: 10,
          offset: (page - 1) * 10,
        },
      });

      const source = data?.materials.items ?? [];

      if (source.length > 0) {
        setPage((p) => p + 1);
      }

      const newOptions =
        source.map((s) => ({
          id: s.id,
          name: s.key,
        })) ?? [];

      setOptions((op) => [...op, ...newOptions]);
    } catch (error) {
      console.error('error', error);
    }
  }, [fetchMaterials, page]);

  useEffect(() => {
    if (page) {
      fetch();
    }
  }, [fetch, page]);

  const onVisibilityChange = useCallback(
    (open: boolean) => {
      if (open && page === 0) {
        setPage(1);
      }
    },
    [page],
  );

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
