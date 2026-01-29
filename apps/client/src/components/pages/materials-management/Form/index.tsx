import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { FormModalWrapper } from '../../../fields/FormModalWrapper';
import InputField from '../../../fields/InputField';
import UnitsField from '../../../fields/UnitsField';
import UnitsFieldArray from './UnitsFieldArray';
import { formSchema } from './schema';
import { FormValues } from './typing';
import classes from './index.module.scss';

interface MaterialsManagementFormProps {
  title: string;
  onSubmit: (values: FormValues) => Promise<void>;
  defaultValues: FormValues;
  submitText: string;
  closeModal: VoidFunction;
  open: boolean;
  mode: 'create' | 'edit';
}

function MaterialsManagementForm({
  title,
  onSubmit,
  defaultValues,
  submitText,
  closeModal,
  open,
  mode,
}: MaterialsManagementFormProps) {
  const methods = useForm<FormValues>({
    resolver: yupResolver(formSchema),
    defaultValues,
  });

  const units = methods.getValues('units');

  return (
    <FormModalWrapper<FormValues>
      methods={methods}
      title={title}
      confirmText={submitText}
      confirmButtonProps={{
        disabled: units.length === 0,
      }}
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
            disabled={mode === 'edit' || undefined}
          />
          <InputField
            name="description"
            label="物料說明"
            placeholder="輸入物料說明"
            size="main"
            required
          />
          <UnitsField
            name="baseUnit"
            label="基礎計量單位"
            placeholder="輸入基礎計量單位"
            size="main"
            required
            disabled={mode === 'edit'}
          />
        </div>
        <UnitsFieldArray />
      </div>
    </FormModalWrapper>
  );
}

export default MaterialsManagementForm;
