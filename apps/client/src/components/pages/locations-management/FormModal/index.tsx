import { useMemo } from 'react';
import * as Yup from 'yup';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { FormModalWrapper } from '../../../fields/FormModalWrapper';
import InputField from '../../../fields/InputField';
import LocationsField from '../../../fields/LocationsField';
import { FormValues } from './typing';
import classes from './index.module.scss';

interface LocationFormModalProps {
  title: string;
  onSubmit: (values: FormValues) => Promise<void>;
  defaultValues: FormValues;
  submitText: string;
  loading: boolean;
  closeModal: VoidFunction;
  open: boolean;
  confirmMode: 'create' | 'edit';
}

function LocationFormModal({
  title,
  onSubmit,
  defaultValues,
  submitText,
  loading,
  closeModal,
  open,
  confirmMode,
}: LocationFormModalProps) {
  const formSchema: Yup.ObjectSchema<FormValues> = useMemo(
    () =>
      Yup.object({
        locationId:
          confirmMode === 'create'
            ? Yup.string().required('必填')
            : Yup.string(),
        description: Yup.string().required('必填'),
        parentLocation: Yup.object({
          id: Yup.string().required('必填'),
          name: Yup.string().required('必填'),
        }).nullable(),
      }),
    [confirmMode],
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
      confirmButtonProps={{
        disabled: loading,
        loading,
      }}
      size="narrow"
      submitWithConfirm
      cancelWithConfirm={methods.formState.isDirty}
    >
      <div className={classes.host}>
        {confirmMode === 'create' && (
          <InputField
            name="locationId"
            label="儲存位置 ID"
            placeholder="輸入儲存位置 ID"
            required
          />
        )}
        <InputField
          name="description"
          label="位置說明"
          placeholder="輸入位置說明"
        />
        <LocationsField
          name="parentLocation"
          label="上層儲存位置"
          fuzzySearch={false}
          selectValueMode
        />
      </div>
    </FormModalWrapper>
  );
}

export default LocationFormModal;
