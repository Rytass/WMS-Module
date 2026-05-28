import { useCallback, useMemo } from 'react';
import SingleAutoCompleteField from '../SingleAutoCompleteField';
import SingleAutoCompleteByIdField from '../SingleAutoCompleteByIdField';
import { TransferOrderOptionsQuery } from '../../../graphql/generated/.graphql';
import { useFetchMoreOptions } from '../../../hooks/useSelectorOptions';
import { useLazyQueryTransferOrderOptions } from './useApi';

interface TransferOrdersFieldProps {
  name: string;
  label?: string;
  placeholder?: string;
  fuzzySearch?: boolean;
  required?: boolean;
  disabled?: boolean;
  selectValueMode: boolean;
}

const TransferOrdersField: FC<TransferOrdersFieldProps> = ({
  name,
  label = '調撥單號',
  placeholder,
  fuzzySearch = true,
  required,
  disabled,
  selectValueMode,
}) => {
  const { fetchTransferOrderOptions } = useLazyQueryTransferOrderOptions();

  const getNewOptions = useCallback(
    (data: TransferOrderOptionsQuery | undefined) =>
      (data?.transferOrders.items ?? []).map((i) => ({
        id: i.id,
        name: i.key,
      })),
    [],
  );

  const {
    currentOptions,
    onVisibilityChange,
    onSearch,
    onClear,
    onReachBottom,
  } = useFetchMoreOptions<TransferOrderOptionsQuery>({
    fetchData: fetchTransferOrderOptions,
    getNewOptions,
  });

  const baseProps = useMemo(
    () => ({
      name,
      label,
      placeholder: placeholder || `輸入${label}`,
      fuzzySearch,
      options: currentOptions,
      required,
      disabled,
      onVisibilityChange,
      onSearch,
      onClear,
      onReachBottom,
    }),
    [
      currentOptions,
      disabled,
      fuzzySearch,
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

export default TransferOrdersField;
