import { useMemo } from 'react';
import { TextFieldSize } from '@mezzanine-ui/react';
import SingleAutoCompleteField from '../SingleAutoCompleteField';
import SingleAutoCompleteByIdField from '../SingleAutoCompleteByIdField';
import { useLazyQuerySaleOrders } from './useApi';

interface SaleOrdersFieldProps {
  saleOrdersId: string;
  name: string;
  label?: string;
  placeholder?: string;
  menuMaxHeight?: number;
  size?: TextFieldSize;
  fuzzySearch?: boolean;
  required?: boolean;
  disabled?: boolean;
  selectValueMode?: boolean;
}

const SaleOrdersField: FC<SaleOrdersFieldProps> = ({
  saleOrdersId,
  name,
  label = '銷售訂單項次',
  placeholder,
  menuMaxHeight,
  size,
  fuzzySearch = true,
  required = false,
  disabled = false,
  selectValueMode = false,
}) => {
  const { currentOptions, onVisibilityChange } =
    useLazyQuerySaleOrders(saleOrdersId);

  const baseProps = useMemo(
    () => ({
      name,
      label,
      placeholder,
      menuMaxHeight,
      size,
      onVisibilityChange,
      options: currentOptions,
      fuzzySearch,
      required,
      disabled,
    }),
    [
      currentOptions,
      disabled,
      fuzzySearch,
      label,
      menuMaxHeight,
      name,
      onVisibilityChange,
      placeholder,
      required,
      size,
    ],
  );

  if (selectValueMode) {
    return <SingleAutoCompleteField {...baseProps} />;
  }

  return <SingleAutoCompleteByIdField {...baseProps} useNameToValue />;
};

export default SaleOrdersField;
