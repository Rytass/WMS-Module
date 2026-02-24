import { ReactNode, useCallback, useMemo } from 'react';
import { FieldValues, useFormState, useWatch } from 'react-hook-form';
import { PageFooter } from '@mezzanine-ui/react';
import { useFormCancel } from '../../../hooks/useFormCancel';
import classes from './index.module.scss';

interface FormFooterProps<T extends FieldValues = FieldValues> {
  disableSubmitButton?: (values: T) => boolean;
  disableCancelButton?: (values: T) => boolean;
  submitText: string;
  cancelText?: string;
  supportingActionName?: string;
  supportingActionOnClick?: VoidFunction;
  haveCancelButton: boolean;
}

export const FormFooter = <T extends FieldValues>({
  disableSubmitButton = () => false,
  disableCancelButton = () => false,
  submitText,
  cancelText = '取消',
  supportingActionName,
  supportingActionOnClick,
  haveCancelButton,
}: FormFooterProps<T>): ReactNode => {
  const onFormCancel = useFormCancel({});
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
      supportingActionType="button"
      supportingActionVariant="destructive-ghost"
      supportingActionName={supportingActionName}
      supportingActionOnClick={supportingActionOnClick}
      actions={{
        primaryButton: {
          children: submitText,
          type: 'submit',
          disabled: disableSubmitButton(values) || loading,
        },
        secondaryButton: haveCancelButton
          ? {
              children: cancelText,
              type: 'button',
              disabled: disableCancelButton(values) || loading,
              onClick: async () => {
                await onCancel();
              },
            }
          : undefined,
      }}
    />
  );
};
