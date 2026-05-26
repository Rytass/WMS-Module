import { useMemo } from 'react';
import {
  ControlFieldSlotLayout,
  FormFieldLayout,
  FormFieldLabelSpacing,
} from '@mezzanine-ui/core/form';
import { Select } from '@mezzanine-ui/react';
import FormField from '@mezzanine-ui/react/Form/FormField';
import NumberInputField from '../../../fields/NumberInputField';
import { StockInActionsFragment } from '../../../../graphql/generated/.graphql';
import { getQuantityWithUnitId, getSaleInformation } from '../../utils';
import classes from './index.module.scss';

interface MatchInventoryProps {
  inventory: StockInActionsFragment;
  index: number;
  serialId: string;
  unitId?: string | null;
  currentUnitName: string;
}

const MatchInventory: FC<MatchInventoryProps> = ({
  inventory,
  index,
  serialId,
  unitId,
  currentUnitName,
}) => {
  const quantity = useMemo(() => {
    return getQuantityWithUnitId({
      inventory,
      currentUnitId: unitId ?? null,
    });
  }, [unitId, inventory]);

  return (
    <FormField
      name={`match-inventory`}
      severity="info"
      hintText={`可用庫存量：${quantity.toLocaleString()} ${currentUnitName}`}
      layout={FormFieldLayout.VERTICAL}
      controlFieldSlotLayout={ControlFieldSlotLayout.SUB}
      labelSpacing={FormFieldLabelSpacing.SUB}
    >
      <div className={classes.fieldWrapper}>
        <Select
          size="sub"
          mode="single"
          className={classes.field}
          value={{
            id: inventory.batch ? inventory.batch.id : '批號',
            name: inventory.batch ? inventory.batch.key : '批號',
          }}
          options={[]}
          disabled
        />
        <Select
          size="sub"
          mode="single"
          className={classes.field}
          value={{
            id: inventory.saleId ? inventory.saleId : '銷售單號',
            name: inventory.saleId
              ? getSaleInformation({
                  saleId: inventory.saleId,
                  saleSerialId: inventory.saleSerialId,
                })
              : '銷售單號',
          }}
          options={[]}
          disabled
        />
        <NumberInputField
          name={`items.${serialId}.${index}.quantity`}
          placeholder="出庫數量"
          suffix={currentUnitName}
        />
      </div>
    </FormField>
  );
};

export default MatchInventory;
