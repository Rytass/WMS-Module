import { ReactNode, useCallback, useMemo } from 'react';
import {
  FieldValues,
  SubmitHandler,
  useFormContext,
  useFormState,
  useWatch,
} from 'react-hook-form';
import { ButtonVariant, PageFooter } from '@mezzanine-ui/react';
import { IconDefinition } from '@mezzanine-ui/icons';
import { useFormCancel } from '../../../hooks/useFormCancel';
import classes from './index.module.scss';

interface FormFooterProps<T extends FieldValues = FieldValues> {
  onSubmit: SubmitHandler<T>;
  pureFormProvider: boolean;
  disableSubmitButton?: (values: T) => boolean;
  disableCancelButton?: (values: T) => boolean;
  submitText: string;
  primaryButtonVariant?: ButtonVariant;
  primaryButtonIcon?: IconDefinition;
  cancelText?: string;
  secondaryButtonVariant?: ButtonVariant;
  supportingActionName?: string;
  supportingActionOnClick?: VoidFunction;
  haveCancelButton: boolean;
}

export const FormFooter = <T extends FieldValues>({
  onSubmit,
  pureFormProvider,
  disableSubmitButton = () => false,
  disableCancelButton = () => false,
  submitText,
  primaryButtonVariant,
  primaryButtonIcon,
  cancelText = '取消',
  secondaryButtonVariant,
  supportingActionName,
  supportingActionOnClick,
  haveCancelButton,
}: FormFooterProps<T>): ReactNode => {
  const onFormCancel = useFormCancel({});
  const { handleSubmit } = useFormContext<T>();
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
          type: pureFormProvider ? 'button' : 'submit',
          variant: primaryButtonVariant,
          iconType: 'leading',
          icon: primaryButtonIcon,
          disabled: disableSubmitButton(values) || loading,
          onClick: pureFormProvider ? handleSubmit(onSubmit) : undefined,
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
