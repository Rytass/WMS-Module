import { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { FormFieldLayout } from '@mezzanine-ui/core/form';
import { Message } from '@mezzanine-ui/react';
import { FormWrapper } from '../../../fields/FormWrapper';
import { InputField } from '../../../fields/InputField';
import { useInventoryActions } from '../../../inventoryActions/useInventoryActions';
import { LabelInputValues } from './typing';

const LabelInput: FC = () => {
  const { pushTargetInventories, targetInventoryIds } = useInventoryActions();

  const methods = useForm<LabelInputValues>({
    defaultValues: {
      label: '',
    },
  });

  const onSubmit = useCallback((values: LabelInputValues) => {
    // const duplicateItem = targetInventoryIds.includes(values.label);

    // if (duplicateItem) {
    //   Message.error(`此項目已在清單中，無法重複加入。`);
    // } else {
    //   pushTargetInventories([values.label]);
    //   methods.setValue('label', '');
    // }

    console.log('label input', values);
  }, []);

  return (
    <FormWrapper methods={methods} onSubmit={onSubmit}>
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
