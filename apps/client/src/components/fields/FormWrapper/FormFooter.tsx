import { ReactNode, useCallback, useMemo } from 'react';
import {
  SubmitHandler,
  FieldValues,
  useFormState,
  useWatch,
} from 'react-hook-form';
import { PageFooter } from '@mezzanine-ui/react';
import { useFormCancel } from '../../../hooks/useFormCancel';
import classes from './index.module.scss';

interface FormFooterProps<T extends FieldValues = FieldValues> {
  onSubmit: SubmitHandler<T>;
  disableSubmitButton?: (values: T) => boolean;
  disableCancelButton?: (values: T) => boolean;
  submitText: string;
  cancelText?: string;
}

export const FormFooter = <T extends FieldValues>({
  onSubmit,
  disableSubmitButton = () => false,
  disableCancelButton = () => false,
  submitText,
  cancelText = '取消',
}: FormFooterProps<T>): ReactNode => {
  const onFormCancel = useFormCancel<T>({
    onSubmit,
  });
  const { isSubmitting } = useFormState<T>();
  const watchValues = useWatch<T>();

  const values = useMemo(() => watchValues as T, [watchValues]);

  const loading = useMemo(() => isSubmitting, [isSubmitting]);

  const onCancel = useCallback(async () => {
    await onFormCancel();
  }, [onFormCancel]);

  return (
    <PageFooter
      className={classes.footer}
      type="standard"
      actions={{
        primaryButton: {
          children: submitText,
          type: 'submit',
          disabled: disableSubmitButton(values) || loading,
        },
        secondaryButton: {
          children: cancelText,
          type: 'button',
          disabled: disableCancelButton(values) || loading,
          onClick: async () => {
            await onCancel();
          },
        },
      }}
    />
  );
};
