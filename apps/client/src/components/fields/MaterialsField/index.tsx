import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import SingleAutoCompleteField from '../SingleAutoCompleteField';
import { MaterialOptionsDocument } from '../../../graphql/generated/.graphql';

interface MaterialsFieldProps {
  name: string;
}

const MaterialsField: FC<MaterialsFieldProps> = ({ name }) => {
  const { data } = useQuery(MaterialOptionsDocument, {
    variables: {
      limit: 10,
    },
  });

  const options = useMemo(() => {
    return (data?.materials.items ?? []).map((item) => ({
      id: item.id,
      name: item.key,
    }));
  }, [data?.materials.items]);

  console.log('data', data);

  return (
    <SingleAutoCompleteField
      name={name}
      label="料號"
      placeholder="輸入料號"
      fuzzySearch
      options={options}
    />
  );
};

export default MaterialsField;
