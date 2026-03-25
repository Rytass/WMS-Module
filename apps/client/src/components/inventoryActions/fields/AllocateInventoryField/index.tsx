import { useWatch } from 'react-hook-form';
import SaleOrderIdsField from '../../../fields/SaleOrderIdsField';
import SaleOrdersField from '../../../fields/SaleOrdersField';
import { AllocateInventoryFieldValues } from './typing';
import classes from './index.module.scss';

function AllocateInventoryField() {
  const saleId = useWatch<AllocateInventoryFieldValues, 'saleId'>({
    name: 'saleId',
  });

  return (
    <div className={classes.host}>
      <div className={classes.selectorsWrapper}>
        <SaleOrderIdsField
          name="saleId"
          // addable
          fuzzySearch={false}
          selectValueMode
          required
        />
        <SaleOrdersField
          saleOrdersId={saleId?.id ?? ''}
          name="saleSerialId"
          // addable
          fuzzySearch={false}
          selectValueMode
          required
          disabled={!saleId}
        />
      </div>
    </div>
  );
}

export default AllocateInventoryField;
