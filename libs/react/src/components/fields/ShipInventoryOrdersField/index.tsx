import { useCallback, useMemo } from 'react';
import SingleAutoCompleteField from '../SingleAutoCompleteField';
import SingleAutoCompleteByIdField from '../SingleAutoCompleteByIdField';
import { ShipInventoryOrderOptionsQuery } from '../../../graphql/generated/.graphql';
import { useFetchMoreOptions } from '../../../hooks/useSelectorOptions';
import {
  useLazyQueryShipInventoryOrderOptions,
  useLazyQueryShipInventoryOrderPendingOptions,
} from './useApi';

interface ShipInventoryOrdersFieldProps {
  name: string;
  label?: string;
  placeholder?: string;
  fuzzySearch?: boolean;
  required?: boolean;
  disabled?: boolean;
  selectValueMode: boolean;
  fetchOnlyPending?: boolean;
}

const ShipInventoryOrdersField: FC<ShipInventoryOrdersFieldProps> = ({
  name,
  label = '出庫單號',
  placeholder,
  fuzzySearch = true,
  required,
  disabled,
  selectValueMode,
  fetchOnlyPending = false,
}) => {
  const { fetchShipInventoryOrderOptions } =
    useLazyQueryShipInventoryOrderOptions();
  const { fetchShipInventoryOrderPendingOptions } =
    useLazyQueryShipInventoryOrderPendingOptions();

  const getNewOptions = useCallback(
    (data: ShipInventoryOrderOptionsQuery | undefined) =>
      (data?.shipInventoryOrders.items ?? []).map((i) => ({
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
  } = useFetchMoreOptions<ShipInventoryOrderOptionsQuery>({
    fetchData: fetchOnlyPending
      ? fetchShipInventoryOrderPendingOptions
      : fetchShipInventoryOrderOptions,
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

export default ShipInventoryOrdersField;
