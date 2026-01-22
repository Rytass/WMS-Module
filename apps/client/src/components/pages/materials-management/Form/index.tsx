import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Typography, Button } from '@mezzanine-ui/react';
import { FormModalWrapper } from '../../../fields/FormModalWrapper';
import InputField from '../../../fields/InputField';
import { formSchema } from './schema';
import { FormValues } from './typing';
import classes from './index.module.scss';

interface MaterialsManagementFormProps {
  title: string;
  onSubmit: (values: FormValues) => Promise<void>;
  submitText: string;
  closeModal: VoidFunction;
  open: boolean;
}

function MaterialsManagementForm({
  title,
  onSubmit,
  submitText,
  closeModal,
  open,
}: MaterialsManagementFormProps) {
  const methods = useForm<FormValues>({
    resolver: yupResolver(formSchema),
    defaultValues: {
      materialNumber: '',
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
        <div className={classes.section}>
          <div className={classes.fieldsArrayTitleWrapper}>
            <Typography variant="label-primary">單位轉換 (1)</Typography>
            <Button type="button" variant="base-secondary" size="minor">
              新增項目
            </Button>
          </div>
        </div>
      </div>
    </FormModalWrapper>
  );
}

export default MaterialsManagementForm;
