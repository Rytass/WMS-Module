import { useForm } from 'react-hook-form';
import { FormFieldLayout } from '@mezzanine-ui/core/form';
import { FormWrapper } from '../../../fields/FormWrapper';
import { InputField } from '../../../fields/InputField';
import { useInventoryActions } from '../../../inventoryActions/useInventoryActions';
import { LabelInputValues } from './typing';

const LabelInput: FC = () => {
  const { pushTargetInventoryIds } = useInventoryActions();

  const methods = useForm<LabelInputValues>({
    defaultValues: {
      label: '',
    },
  });

  return (
    <FormWrapper
      methods={methods}
      onSubmit={(values) => {
        console.log('values', values.label);
      }}
    >
      <InputField
        name="label"
        label="標籤掃碼"
        placeholder="請掃描標籤條碼"
        size="main"
        layout={FormFieldLayout.HORIZONTAL}
      />
    </FormWrapper>
  );
};

export default LabelInput;
