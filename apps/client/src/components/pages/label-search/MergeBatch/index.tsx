import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { FormWrapper } from '../../../fields/FormWrapper';
import { useInventoryActions } from '../../../inventoryActions/useInventoryActions';
import { useClearAll } from '../hooks';
import OperateArea from '../OperateArea';
import { formSchema } from './schema';
import { FormValues } from './typing';

interface MergeBatchProps {
  submitText: string;
}

function MergeBatch({ submitText }: MergeBatchProps) {
  const methods = useForm<FormValues>({
    resolver: yupResolver(formSchema),
    defaultValues: {
      newKey: '',
    },
  });

  const { targetAction, errorSignature, inventorySignature, resetAll } =
    useInventoryActions();
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

export default MergeBatch;
