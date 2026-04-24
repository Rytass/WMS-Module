import { useCallback, useMemo } from 'react';
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
  selectValueMode: boolean;
}

const BatchesField: FC<BatchesFieldProps> = ({
  name,
  label = '批號',
  placeholder,
  addable,
  fuzzySearch = true,
  required,
  disabled,
  selectValueMode,
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
    onClear,
    onReachBottom,
  } = useFetchMoreOptions<BatchOptionsQuery>({
    fetchData: fetchBatches,
    getNewOptions,
  });

  const handleInsert = useInsertOption(setOptions);

  const baseProps = useMemo(
    () => ({
      name,
      addable,
      label,
      placeholder: placeholder || `輸入${label}`,
      fuzzySearch,
      options: currentOptions,
      required,
      disabled,
      onVisibilityChange,
      onInsert: handleInsert,
      onSearch,
      onClear,
      onReachBottom,
    }),
    [
      addable,
      currentOptions,
      disabled,
      fuzzySearch,
      handleInsert,
      label,
      name,
      onReachBottom,
      onSearch,
      onClear,
      onVisibilityChange,
      placeholder,
      required,
    ],
  );

  if (selectValueMode) {
    return <SingleAutoCompleteField {...baseProps} />;
  }

  return <SingleAutoCompleteByIdField {...baseProps} useNameToValue />;
};

export default BatchesField;
