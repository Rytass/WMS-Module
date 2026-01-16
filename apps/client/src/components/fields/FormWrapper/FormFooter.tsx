import { ReactNode, useMemo } from 'react';
import { FieldValues, useFormState, useWatch } from 'react-hook-form';
import { PageFooter } from '@mezzanine-ui/react';
import classes from './index.module.scss';

interface FormFooterProps<T extends FieldValues = FieldValues> {
  disableSubmitButton?: (values: T) => boolean;
  disableCancelButton?: (values: T) => boolean;
  submitText: string;
  cancelText?: string;
}

export const FormFooter = <T extends FieldValues>({
  disableSubmitButton = () => false,
  disableCancelButton = () => false,
  submitText,
  cancelText = '取消',
}: FormFooterProps<T>): ReactNode => {
  const { isSubmitting } = useFormState<T>();
  const watchValues = useWatch<T>();

  const values = useMemo(() => watchValues as T, [watchValues]);

  const loading = useMemo(() => isSubmitting, [isSubmitting]);

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
        },
      }}
    />
  );
};
