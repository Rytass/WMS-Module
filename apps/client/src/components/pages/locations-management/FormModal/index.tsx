import { useMemo } from 'react';
import * as Yup from 'yup';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { FormModalWrapper } from '../../../fields/FormModalWrapper';
import InputField from '../../../fields/InputField';
import { FormValues } from './typing';
import classes from './index.module.scss';

interface LocationFormModalProps {
  title: string;
  onSubmit: (values: FormValues) => Promise<void>;
  defaultValues: FormValues;
  submitText: string;
  closeModal: VoidFunction;
  open: boolean;
  confirmMode: 'create' | 'edit';
}

function LocationFormModal({
  title,
  onSubmit,
  defaultValues,
  submitText,
  closeModal,
  open,
  confirmMode,
}: LocationFormModalProps) {
  const formSchema: Yup.ObjectSchema<FormValues> = useMemo(
    () =>
      Yup.object({
        description: Yup.string(),
      }),
    [],
  );

  const methods = useForm<FormValues>({
    resolver: yupResolver(formSchema),
    defaultValues,
  });

  return (
    <FormModalWrapper<FormValues>
      methods={methods}
      title={title}
      confirmText={submitText}
      onSubmit={onSubmit}
      closeModal={closeModal}
      open={open}
      confirmMode={confirmMode}
      size="narrow"
      submitWithConfirm
      cancelWithConfirm={methods.formState.isDirty}
    >
      <div className={classes.host}>
        <InputField
          name="description"
          label="位置說明"
          placeholder="輸入位置說明"
        />
      </div>
    </FormModalWrapper>
  );
}

export default LocationFormModal;
