import { useCallback } from 'react';
import SingleAutoCompleteField from '../SingleAutoCompleteField';
import { BatchOptionsQuery } from '../../../graphql/generated/.graphql';
import {
  useFetchMoreOptions,
  useInsertOption,
} from '../../../hooks/useSelectorOptions';
import { useLazyQueryBatches } from './useApi';

interface BatchesFieldProps {
  name: string;
  addable?: boolean;
  fuzzySearch?: boolean;
  required?: boolean;
}

const BatchesField: FC<BatchesFieldProps> = ({
  name,
  addable,
  fuzzySearch = true,
  required,
}) => {
  const { fetchBatches } = useLazyQueryBatches();

  const getNewOptions = useCallback(
    (data: BatchOptionsQuery | undefined) =>
      (data?.batches.items ?? []).map((i) => ({
        id: i.id,
        name: i.key,
      })),
    [],
  );

  const {
    currentOptions,
    setOptions,
    onVisibilityChange,
    onSearch,
    onReachBottom,
  } = useFetchMoreOptions<BatchOptionsQuery>({
    fetchData: fetchBatches,
    getNewOptions,
  });

  const handleInsert = useInsertOption(setOptions);

  return (
    <SingleAutoCompleteField
      name={name}
      addable={addable}
      label="批號"
      placeholder="輸入批號"
      fuzzySearch={fuzzySearch}
      options={currentOptions}
      required={required}
      onVisibilityChange={onVisibilityChange}
      useNameToValue
      onInsert={handleInsert}
      onSearch={onSearch}
      onReachBottom={onReachBottom}
    />
  );
};

export default BatchesField;
