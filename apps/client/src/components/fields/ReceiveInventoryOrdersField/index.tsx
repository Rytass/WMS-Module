import { useCallback, useMemo } from 'react';
import SingleAutoCompleteField from '../SingleAutoCompleteField';
import SingleAutoCompleteByIdField from '../SingleAutoCompleteByIdField';
import { ReceiveInventoryOrderOptionsQuery } from '../../../graphql/generated/.graphql';
import { useFetchMoreOptions } from '../../../hooks/useSelectorOptions';
import { useLazyQueryReceiveInventoryOrderOptions } from './useApi';

interface ReceiveInventoryOrdersFieldProps {
  name: string;
  label?: string;
  placeholder?: string;
  fuzzySearch?: boolean;
  required?: boolean;
  disabled?: boolean;
  selectValueMode: boolean;
}

const ReceiveInventoryOrdersField: FC<ReceiveInventoryOrdersFieldProps> = ({
  name,
  label = '入庫單號',
  placeholder,
  fuzzySearch = true,
  required,
  disabled,
  selectValueMode,
}) => {
  const { fetchReceiveInventoryOrderOptions } =
    useLazyQueryReceiveInventoryOrderOptions();

  const getNewOptions = useCallback(
    (data: ReceiveInventoryOrderOptionsQuery | undefined) =>
      (data?.receiveInventoryOrders.items ?? []).map((i) => ({
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
  } = useFetchMoreOptions<ReceiveInventoryOrderOptionsQuery>({
    fetchData: fetchReceiveInventoryOrderOptions,
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

export default ReceiveInventoryOrdersField;
