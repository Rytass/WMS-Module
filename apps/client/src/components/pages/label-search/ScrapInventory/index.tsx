import { useForm } from 'react-hook-form';
import { FormWrapper } from '../../../fields/FormWrapper';
import { useInventoryActions } from '../../../inventoryActions/useInventoryActions';
import { useClearAll } from '../hooks';
import OperateArea from '../OperateArea';

interface ScrapInventoryProps {
  submitText: string;
}

function ScrapInventory({ submitText }: ScrapInventoryProps) {
  const methods = useForm();
  const { targetAction, errorSignature, inventorySignature, resetAll } =
    useInventoryActions();
  const onClearAll = useClearAll();

  return (
    <FormWrapper
      methods={methods}
      havePageFooter
      submitText={submitText}
      primaryButtonVariant="destructive-primary"
      haveCancelButton={false}
      supportingActionName="重置全部"
      supportingActionOnClick={onClearAll}
    >
      <OperateArea />
    </FormWrapper>
  );
}

export default ScrapInventory;
