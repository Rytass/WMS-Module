import { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { FormFieldLayout } from '@mezzanine-ui/core/form';
import { useModal } from '../../../modal/useModal';
import { FormWrapper } from '../../../fields/FormWrapper';
import { InputField } from '../../../fields/InputField';
import {
  useAddInventories,
  useInventoryActions,
} from '../../../inventoryActions/useInventoryActions';
import ChooseStockTable from './ChooseStockTable';
import { LabelInputValues } from './typing';

const LabelInput: FC = () => {
  const { openModal, closeModal } = useModal();
  const addInventories = useAddInventories();
  const { targetAction } = useInventoryActions();

  const methods = useForm<LabelInputValues>({
    defaultValues: {
      label: '',
    },
  });

  const onSubmit = useCallback(
    (values: LabelInputValues) => {
      openModal({
        title: `${values.label}`,
        cancelButtonProps: {
          style: {
            display: 'none',
          },
        },
        confirmButtonProps: {
          variant: 'base-secondary',
        },
        confirmText: '關閉',
        onConfirm: closeModal,
        children: (
          <ChooseStockTable
            materialKey={values.label}
            targetAction={targetAction}
            addInventories={addInventories}
          />
        ),
      });
      methods.setValue('label', '');
    },
    [addInventories, closeModal, methods, openModal, targetAction],
  );

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
