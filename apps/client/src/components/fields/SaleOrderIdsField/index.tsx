import { useCallback, useMemo } from 'react';
import SingleAutoCompleteField from '../SingleAutoCompleteField';
import SingleAutoCompleteByIdField from '../SingleAutoCompleteByIdField';
import { SaleOrderDistinctIdsQuery } from '../../../graphql/generated/.graphql';
import { useFetchMoreOptions } from '../../../hooks/useSelectorOptions';
import { useLazyQuerySaleOrderIds } from './useApi';

interface SaleOrderIdsFieldProps {
  name: string;
  label?: string;
  placeholder?: string;
  fuzzySearch?: boolean;
  required?: boolean;
  disabled?: boolean;
  selectValueMode?: boolean;
}

const SaleOrderIdsField: FC<SaleOrderIdsFieldProps> = ({
  name,
  label = '銷售訂單號碼',
  placeholder,
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

  const { currentOptions, onVisibilityChange, onSearch, onReachBottom } =
    useFetchMoreOptions<SaleOrderDistinctIdsQuery>({
      fetchData: fetchSaleOrderIds,
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
