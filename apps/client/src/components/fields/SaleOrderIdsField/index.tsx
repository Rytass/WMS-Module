import { MouseEventHandler, useCallback, useMemo } from 'react';
import { SelectValue } from '@mezzanine-ui/react';
import SingleAutoCompleteField from '../SingleAutoCompleteField';
import SingleAutoCompleteByIdField from '../SingleAutoCompleteByIdField';
import { SaleOrderDistinctIdsQuery } from '../../../graphql/generated/.graphql';
import { useFetchMoreOptions } from '../../../hooks/useSelectorOptions';
import { useInsertOption } from '../../../hooks/useSelectorOptions';
import { useLazyQuerySaleOrderIds } from './useApi';

interface SaleOrderIdsFieldProps {
  name: string;
  label?: string;
  placeholder?: string;
  onChange?(newOptions: SelectValue<string>): void;
  onClear?: MouseEventHandler;
  addable?: boolean;
  fuzzySearch?: boolean;
  required?: boolean;
  disabled?: boolean;
  selectValueMode?: boolean;
}

const SaleOrderIdsField: FC<SaleOrderIdsFieldProps> = ({
  name,
  label = '銷售訂單號碼',
  placeholder,
  onChange,
  onClear,
  addable,
  fuzzySearch = true,
  required,
  disabled,
  selectValueMode = false,
}) => {
  const { fetchSaleOrderIds } = useLazyQuerySaleOrderIds();

  const getNewOptions = useCallback(
    (data: SaleOrderDistinctIdsQuery | undefined) =>
      (data?.saleOrderDistinctIds ?? []).map((i) => ({
        id: i,
        name: i,
      })),
    [],
  );

  const {
    currentOptions,
    setOptions,
    onVisibilityChange,
    onSearch,
    onReachBottom,
  } = useFetchMoreOptions<SaleOrderDistinctIdsQuery>({
    fetchData: fetchSaleOrderIds,
    getNewOptions,
  });

  const handleInsert = useInsertOption(setOptions);

  const baseProps = useMemo(
    () => ({
      name,
      addable,
      label,
      placeholder: placeholder || `輸入${label}`,
      onChange,
      onClear,
      fuzzySearch,
      options: currentOptions,
      required,
      disabled,
      onInsert: handleInsert,
      onVisibilityChange,
      onSearch,
      onReachBottom,
    }),
    [
      currentOptions,
      disabled,
      fuzzySearch,
      label,
      name,
      addable,
      onChange,
      onClear,
      handleInsert,
      onReachBottom,
      onSearch,
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

export default SaleOrderIdsField;
