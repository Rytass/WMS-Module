import { ReactNode, useCallback, useMemo } from 'react';
import { FieldValues, useFormState, useWatch } from 'react-hook-form';
import { PageFooter } from '@mezzanine-ui/react';
import { useDialog } from '../../dialog/useDialog';
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
  const { openDialog } = useDialog();
  const { isSubmitting } = useFormState<T>();
  const watchValues = useWatch<T>();

  const values = useMemo(() => watchValues as T, [watchValues]);

  const loading = useMemo(() => isSubmitting, [isSubmitting]);

  const onCancel = useCallback(async () => {
    const isConfirm = await openDialog({
      title: '尚未儲存變更',
      children: '您有尚未儲存的內容，確定要離開此頁嗎？',
      cancelText: '放棄變更',
      confirmText: '儲存變更',
    });

    if (isConfirm) {
      console.log('good');
    } else {
      console.log('bad');
    }
  }, [openDialog]);

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
