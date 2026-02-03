import { useForm } from 'react-hook-form';
import { IconDefinition } from '@mezzanine-ui/icons';
import FormDrawerWrapper from '../../fields/FormDrawerWrapper';
import InventoryFieldArray from '../../InventoryFieldArray';
import { initInventoryFieldItem } from '../../InventoryFieldArray/InventoryFormCard/utils';
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
        targetStocks.map((s) => initInventoryFieldItem(s)),
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
