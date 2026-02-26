import { ReactNode, useCallback, useMemo } from 'react';
import { FieldValues, useFormState, useWatch } from 'react-hook-form';
import { ButtonVariant, PageFooter } from '@mezzanine-ui/react';
import { useFormCancel } from '../../../hooks/useFormCancel';
import classes from './index.module.scss';

interface FormFooterProps<T extends FieldValues = FieldValues> {
  disableSubmitButton?: (values: T) => boolean;
  disableCancelButton?: (values: T) => boolean;
  submitText: string;
  primaryButtonVariant?: ButtonVariant;
  cancelText?: string;
  secondaryButtonVariant?: ButtonVariant;
  supportingActionName?: string;
  supportingActionOnClick?: VoidFunction;
  haveCancelButton: boolean;
}

export const FormFooter = <T extends FieldValues>({
  disableSubmitButton = () => false,
  disableCancelButton = () => false,
  submitText,
  primaryButtonVariant,
  cancelText = '取消',
  secondaryButtonVariant,
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
          variant: primaryButtonVariant,
          disabled: disableSubmitButton(values) || loading,
          loading,
        },
        secondaryButton: haveCancelButton
          ? {
              children: cancelText,
              type: 'button',
              variant: secondaryButtonVariant ?? 'base-secondary',
              disabled: disableCancelButton(values) || loading,
              onClick: async () => {
                await onCancel();
              },
              loading,
            }
          : undefined,
      }}
    />
  );
};
