import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { FormModalWrapper } from '../../../fields/FormModalWrapper';
import InputField from '../../../fields/InputField';
import UnitsFieldArray from './UnitsFieldArray';
import { formSchema } from './schema';
import { FormValues } from './typing';
import classes from './index.module.scss';

interface MaterialsManagementFormProps {
  title: string;
  onSubmit: (values: FormValues) => Promise<void>;
  submitText: string;
  closeModal: VoidFunction;
  open: boolean;
  mode: 'create' | 'edit';
}

function MaterialsManagementForm({
  title,
  onSubmit,
  submitText,
  closeModal,
  open,
  mode,
}: MaterialsManagementFormProps) {
  const methods = useForm<FormValues>({
    resolver: yupResolver(formSchema),
    defaultValues: {
      materialNumber: '',
      description: '',
      units: [
        {
          unit: '',
        },
      ],
    },
  });

  return (
    <FormModalWrapper<FormValues>
      methods={methods}
      title={title}
      confirmText={submitText}
      onSubmit={onSubmit}
      closeModal={closeModal}
      open={open}
      mode={mode}
      submitWithConfirm
      cancelWithConfirm={methods.formState.isDirty}
    >
      <div className={classes.host}>
        <div className={classes.section}>
          <InputField
            name="materialNumber"
            label="料號"
            placeholder="輸入料號"
            size="main"
            required
          />
          <InputField
            name="description"
            label="物料說明"
            placeholder="輸入物料說明"
            size="main"
            required
          />
        </div>
        <UnitsFieldArray />
      </div>
    </FormModalWrapper>
  );
}

export default MaterialsManagementForm;
