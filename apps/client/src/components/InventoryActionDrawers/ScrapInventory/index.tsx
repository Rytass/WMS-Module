import { useForm } from 'react-hook-form';
import { IconDefinition } from '@mezzanine-ui/icons';
import FormDrawerWrapper from '../../fields/FormDrawerWrapper';
import InventoryFieldArray from '../../InventoryFieldArray';
import { initInventoryFieldItem } from '../../InventoryFieldArray/InventoryFormCard/utils';
import { AggregatedStockFragment } from '../../../graphql/generated/.graphql';
import { useClearAll } from '../hooks';
import { FormValues } from './typing';
import { useEffect } from 'react';

interface ScrapInventoryProps {
  targetStocks: AggregatedStockFragment[];
  onClose: VoidFunction;
  open: boolean;
  headerTitle: string;
  bottomPrimaryActionText: string;
  bottomPrimaryActionIcon?: IconDefinition;
}

const ScrapInventory: FC<ScrapInventoryProps> = ({
  targetStocks,
  onClose,
  open,
  headerTitle,
  bottomPrimaryActionText,
  bottomPrimaryActionIcon,
}) => {
  const methods = useForm<FormValues>();
  const onClearAll = useClearAll(() => {
    methods.setValue('stocks', []);
  });

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
      bottomPrimaryActionVariant="destructive-primary"
      bottomOnGhostActionClick={onClearAll}
    >
      <InventoryFieldArray />
    </FormDrawerWrapper>
  );
};

export default ScrapInventory;
