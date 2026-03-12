import { useMemo } from 'react';
import { TextFieldSize } from '@mezzanine-ui/react';
import SingleAutoCompleteField from '../SingleAutoCompleteField';
import SingleAutoCompleteByIdField from '../SingleAutoCompleteByIdField';
import { useInsertOption } from '../../../hooks/useSelectorOptions';
import { useLazyQuerySaleOrders } from './useApi';

interface SaleOrdersFieldProps {
  saleOrdersId: string;
  name: string;
  label?: string;
  placeholder?: string;
  addable?: boolean;
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
  addable,
  menuMaxHeight,
  size,
  fuzzySearch = true,
  required = false,
  disabled = false,
  selectValueMode = false,
}) => {
  const { currentOptions, setCurrentOptions, onVisibilityChange } =
    useLazyQuerySaleOrders(saleOrdersId);

  const handleInsert = useInsertOption(setCurrentOptions);

  const baseProps = useMemo(
    () => ({
      name,
      addable,
      label,
      placeholder: placeholder || `輸入${label}`,
      menuMaxHeight,
      size,
      onInsert: handleInsert,
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
      addable,
      handleInsert,
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
