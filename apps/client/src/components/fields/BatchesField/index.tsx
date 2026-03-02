import { useCallback } from 'react';
import SingleAutoCompleteField from '../SingleAutoCompleteField';
import { BatchOptionsQuery } from '../../../graphql/generated/.graphql';
import { useFetchMoreOptions } from '../../../hooks/useSelectorOptions';
import { useLazyQueryBatches } from './useApi';

interface BatchesFieldProps {
  name: string;
  required?: boolean;
}

const BatchesField: FC<BatchesFieldProps> = ({ name, required }) => {
  const { fetchBatches } = useLazyQueryBatches();

  const getNewOptions = useCallback(
    (data: BatchOptionsQuery | undefined) =>
      (data?.batches.items ?? []).map((i) => ({
        id: i.id,
        name: i.key,
      })),
    [],
  );

  const { currentOptions, onVisibilityChange, onSearch, onReachBottom } =
    useFetchMoreOptions<BatchOptionsQuery>({
      fetchData: fetchBatches,
      getNewOptions,
    });

  return (
    <SingleAutoCompleteField
      name={name}
      label="批號"
      placeholder="輸入批號"
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

export default BatchesField;
