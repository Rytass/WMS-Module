import { useCallback } from 'react';
import SingleAutoCompleteField from '../SingleAutoCompleteField';
import SingleAutoCompleteByIdField from '../SingleAutoCompleteByIdField';
import { BatchOptionsQuery } from '../../../graphql/generated/.graphql';
import {
  useFetchMoreOptions,
  useInsertOption,
} from '../../../hooks/useSelectorOptions';
import { useLazyQueryBatches } from './useApi';

interface BatchesFieldProps {
  name: string;
  label?: string;
  placeholder?: string;
  addable?: boolean;
  fuzzySearch?: boolean;
  required?: boolean;
  disabled?: boolean;
  selectValueMode?: boolean;
}

const BatchesField: FC<BatchesFieldProps> = ({
  name,
  label = '批號',
  placeholder,
  addable,
  fuzzySearch = true,
  required,
  disabled,
  selectValueMode = false,
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

  if (selectValueMode) {
    return (
      <SingleAutoCompleteField
        name={name}
        addable={addable}
        label={label}
        placeholder={placeholder || `輸入${label}`}
        fuzzySearch={fuzzySearch}
        options={currentOptions}
        required={required}
        disabled={disabled}
        onVisibilityChange={onVisibilityChange}
        onInsert={handleInsert}
        onSearch={onSearch}
        onReachBottom={onReachBottom}
      />
    );
  }

  return (
    <SingleAutoCompleteByIdField
      name={name}
      addable={addable}
      label={label}
      placeholder={placeholder || `輸入${label}`}
      fuzzySearch={fuzzySearch}
      options={currentOptions}
      required={required}
      disabled={disabled}
      onVisibilityChange={onVisibilityChange}
      useNameToValue
      onInsert={handleInsert}
      onSearch={onSearch}
      onReachBottom={onReachBottom}
    />
  );
};

export default BatchesField;
