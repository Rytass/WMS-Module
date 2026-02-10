import { useForm } from 'react-hook-form';
import { IconDefinition } from '@mezzanine-ui/icons';
import FormDrawerWrapper from '../../fields/FormDrawerWrapper';
import InventoryGrid from '../../InventoryGrid';
import { useClearAll } from '../hooks';
import { FormValues } from './typing';

interface ReleaseHoldInventoryProps {
  onClose: VoidFunction;
  open: boolean;
  headerTitle: string;
  bottomPrimaryActionText: string;
  bottomPrimaryActionIcon?: IconDefinition;
}

const ReleaseHoldInventory: FC<ReleaseHoldInventoryProps> = ({
  onClose,
  open,
  headerTitle,
  bottomPrimaryActionText,
  bottomPrimaryActionIcon,
}) => {
  const methods = useForm<FormValues>();
  const onClearAll = useClearAll(() => {
    //
  });

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
      bottomOnGhostActionClick={onClearAll}
    >
      <InventoryGrid />
    </FormDrawerWrapper>
  );
};

export default ReleaseHoldInventory;
