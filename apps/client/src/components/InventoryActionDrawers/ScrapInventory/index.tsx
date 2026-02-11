import { useForm } from 'react-hook-form';
import { IconDefinition } from '@mezzanine-ui/icons';
import FormDrawerWrapper from '../../fields/FormDrawerWrapper';
import InventoryGrid from '../InventoryGrid';
import { useClearAll } from '../hooks';

interface ScrapInventoryProps {
  onClose: VoidFunction;
  open: boolean;
  headerTitle: string;
  bottomPrimaryActionText: string;
  bottomPrimaryActionIcon?: IconDefinition;
}

const ScrapInventory: FC<ScrapInventoryProps> = ({
  onClose,
  open,
  headerTitle,
  bottomPrimaryActionText,
  bottomPrimaryActionIcon,
}) => {
  const methods = useForm();
  const onClearAll = useClearAll();

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
      {/* <InventoryGrid /> */}
      ScrapInventory
    </FormDrawerWrapper>
  );
};

export default ScrapInventory;
