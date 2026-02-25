import { useForm } from 'react-hook-form';
import { FormWrapper } from '../../../fields/FormWrapper';
import { useInventoryActions } from '../../../inventoryActions/useInventoryActions';
import { useHoldInventory } from '../../../inventoryActions/useApi';
import { useClearAll } from '../hooks';
import OperateArea from '../OperateArea';

interface HoldInventoryProps {
  submitText: string;
}

function HoldInventory({ submitText }: HoldInventoryProps) {
  const methods = useForm();
  const { targetAction, errorSignature, inventorySignature, resetAll } =
    useInventoryActions();
  const { holdInventory } = useHoldInventory();
  const onClearAll = useClearAll();

  return (
    <FormWrapper
      methods={methods}
      havePageFooter
      submitText={submitText}
      haveCancelButton={false}
      supportingActionName="重置全部"
      supportingActionOnClick={onClearAll}
    >
      <OperateArea />
    </FormWrapper>
  );
}

export default HoldInventory;
