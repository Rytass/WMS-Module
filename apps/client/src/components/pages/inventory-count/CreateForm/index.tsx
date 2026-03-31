import { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { FormModalWrapper } from '../../../fields/FormModalWrapper';
import InputField from '../../../fields/InputField';
import { formSchema } from './schema';
import { FormValues } from './typing';
import classes from './index.module.scss';

interface CreateInventoryCountFormProps {
  closeModal: VoidFunction;
  open: boolean;
}

function CreateInventoryCountForm({
  closeModal,
  open,
}: CreateInventoryCountFormProps) {
  const methods = useForm<FormValues>({
    resolver: yupResolver(formSchema),
    defaultValues: {
      name: '',
    },
  });

  const onSubmit = useCallback(async (values: FormValues) => {
    console.log('values', values);
  }, []);

  return (
    <FormModalWrapper<FormValues>
      methods={methods}
      title="建立盤點"
      confirmText="建立盤點"
      onSubmit={onSubmit}
      closeModal={closeModal}
      open={open}
      confirmMode="create"
      size="narrow"
      submitWithConfirm
      cancelWithConfirm={methods.formState.isDirty}
    >
      <div className={classes.host}>
        <InputField
          name="name"
          label="名稱"
          placeholder="輸入名稱"
          size="main"
          required
        />
      </div>
    </FormModalWrapper>
  );
}

export default CreateInventoryCountForm;
