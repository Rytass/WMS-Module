import { useForm } from 'react-hook-form';
import { IconDefinition } from '@mezzanine-ui/icons';
import FormDrawerWrapper from '../../fields/FormDrawerWrapper';
import InventoryFieldArray from '../../InventoryFieldArray/';
import { AggregatedStockFragment } from '../../../graphql/generated/.graphql';
import { FormValues } from './typing';
import { useEffect } from 'react';

interface HoldInventoryProps {
  targetStocks: AggregatedStockFragment[];
  onClose: VoidFunction;
  open: boolean;
  headerTitle: string;
  bottomPrimaryActionText: string;
  bottomPrimaryActionIcon?: IconDefinition;
}

const HoldInventory: FC<HoldInventoryProps> = ({
  targetStocks,
  onClose,
  open,
  headerTitle,
  bottomPrimaryActionText,
  bottomPrimaryActionIcon,
}) => {
  const methods = useForm<FormValues>();

  useEffect(() => {
    if (open) {
      methods.setValue(
        'stocks',
        targetStocks.map((s) => ({
          stockId: s.id,
          materialKey: s.material.key,
          batchKey: s.batch.key,
          originQuantity: s.quantity,
          quantity: s.quantity,
          inputQuantity: `${s.quantity}`,
          selectedUnit: s.material.baseUnit.key,
          units: [
            ...s.material.materialUnits.map((u) => ({
              id: u.unit,
              name: u.unit,
              conversionFactor: u.conversionFactor,
            })),
          ],
        })),
      );
    }
  }, [methods, open, targetStocks]);

  return (
    <FormDrawerWrapper
      onClose={onClose}
      open={open}
      methods={methods}
      onSubmit={(values) => {
        console.log('values', values);
      }}
      headerTitle={headerTitle}
      bottomPrimaryActionText={bottomPrimaryActionText}
      bottomPrimaryActionIcon={bottomPrimaryActionIcon}
      bottomOnGhostActionClick={() => {
        console.log('ghost');
      }}
    >
      <InventoryFieldArray />
    </FormDrawerWrapper>
  );
};

export default HoldInventory;
