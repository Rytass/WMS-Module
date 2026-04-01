import { useCallback, useEffect } from 'react';
import { useWatch, useFormContext } from 'react-hook-form';
import ShipInventoryOrdersField from '../../../fields/ShipInventoryOrdersField';
import InputField from '../../../fields/InputField';
import { useLazyQueryShipInventoryOrder } from './useApi';
import { ShipInventoryFieldValues } from './typing';
import classes from './index.module.scss';

function ShipInventoryField() {
  const { fetchShipInventoryOrder } = useLazyQueryShipInventoryOrder();
  const shipInventoryOrderValue = useWatch<
    ShipInventoryFieldValues,
    'shipInventoryOrder'
  >({
    name: 'shipInventoryOrder',
  });
  const { setValue } = useFormContext<ShipInventoryFieldValues>();

  const doFetchShipInventoryOrder = useCallback(
    async (shipInventoryOrderId: string) => {
      const { data } = await fetchShipInventoryOrder({
        variables: {
          shipInventoryOrderId,
        },
      });

      if (data?.shipInventoryOrder.id) {
        const shipInventoryOrder = data.shipInventoryOrder;

        setValue('description', shipInventoryOrder.description || '');
      }
    },
    [fetchShipInventoryOrder, setValue],
  );

  useEffect(() => {
    if (shipInventoryOrderValue) {
      doFetchShipInventoryOrder(shipInventoryOrderValue.id);
    } else {
      setValue('description', '');
    }
  }, [doFetchShipInventoryOrder, setValue, shipInventoryOrderValue]);

  return (
    <div className={classes.host}>
      <div className={classes.selectorsWrapper}>
        <ShipInventoryOrdersField
          name="shipInventoryOrder"
          label="出庫單號"
          fuzzySearch={false}
          selectValueMode
          fetchOnlyPending
          required
        />
        <InputField name="description" label="備註" placeholder="輸入備註" />
      </div>
    </div>
  );
}

export default ShipInventoryField;
