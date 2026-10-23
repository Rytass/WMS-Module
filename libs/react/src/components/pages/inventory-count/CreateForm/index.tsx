import { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { FormModalWrapper } from '../../../fields/FormModalWrapper';
import InputField from '../../../fields/InputField';
import DateField from '../../../fields/DateField';
import LocationScopeField from './LocationScopeField';
import { formSchema } from './schema';
import { FormValues } from './typing';
import classes from './index.module.scss';

interface CreateInventoryCountFormProps {
  closeModal: VoidFunction;
  open: boolean;
  onSubmit: (values: FormValues) => Promise<void> | void;
}

const CreateInventoryCountForm: FC<CreateInventoryCountFormProps> = ({
  closeModal,
  open,
  onSubmit,
}) => {
  const methods = useForm<FormValues>({
    resolver: yupResolver(formSchema),
    defaultValues: {
      name: '',
      countDate: '',
      locations: [],
    },
  });

  const handleSubmit = useCallback(
    async (values: FormValues) => {
      await onSubmit(values);
    },
    [onSubmit],
  );

  return (
    <FormModalWrapper<FormValues>
      methods={methods}
      title="建立盤點"
      confirmText="建立盤點"
      onSubmit={handleSubmit}
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
        <DateField
          name="countDate"
          label="盤點日期"
          size="main"
          placeholder="盤點日期"
          required
        />
        <LocationScopeField name="locations" />
      </div>
    </FormModalWrapper>
  );
};

export default CreateInventoryCountForm;
