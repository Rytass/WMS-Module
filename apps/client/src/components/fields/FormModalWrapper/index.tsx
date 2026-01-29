import { ReactNode, useCallback, useEffect } from 'react';
import { ModalProps, ModalSize, Modal } from '@mezzanine-ui/react';
import { UseFormReturn, SubmitHandler, FieldValues } from 'react-hook-form';
import { FormWrapper } from '../FormWrapper';
import { useDialog } from '../../dialog/useDialog';

type FormModalWrapperProps<T extends FieldValues = FieldValues> = Omit<
  ModalProps,
  'modalType' | 'onSubmit'
> & {
  size?: ModalSize;
  methods: UseFormReturn<T>;
  onSubmit: SubmitHandler<T>;
  children: ReactNode;
  closeModal: VoidFunction;
  open: boolean;
  mode: 'create' | 'edit';
  submitWithConfirm?: boolean;
  cancelWithConfirm?: boolean;
};

export const FormModalWrapper = <T extends FieldValues = FieldValues>({
  methods,
  className,
  title,
  size = 'regular',
  cancelButtonProps,
  confirmButtonProps,
  cancelText = '取消',
  confirmText = '確認',
  onSubmit,
  children: modalChildren,
  closeModal: closeModalProps,
  open,
  mode,
  submitWithConfirm = false,
  cancelWithConfirm = false,
}: FormModalWrapperProps<T>) => {
  const { openDialog } = useDialog();

  useEffect(() => {
    if (!open) {
      methods.reset();
    }
  }, [methods, open]);

  const closeModal = useCallback(async () => {
    if (cancelWithConfirm) {
      const isConfirm = await openDialog({
        modalStatusType: 'warning',
        title: '尚未儲存變更',
        supportingText: '您有尚未儲存的內容，確定要離開此頁嗎？',
        cancelText: '返回',
        confirmText: '放棄變更',
        confirmButtonProps: {
          variant: 'destructive-primary',
        },
      });

      if (isConfirm) {
        closeModalProps();
      }
    } else {
      closeModalProps();
    }
  }, [cancelWithConfirm, closeModalProps, openDialog]);

  const onConfirm = useCallback(async () => {
    if (submitWithConfirm) {
      const isValid = await methods.trigger();

      if (isValid) {
        const isConfirm = await openDialog({
          modalStatusType: 'info',
          title: (() => {
            switch (mode) {
              case 'create':
                return '確認新增資料';

              case 'edit':
                return '確認儲存變更';

              default:
                return '';
            }
          })(),
          supportingText: (() => {
            switch (mode) {
              case 'create':
                return '您即將進入新增流程，完成後系統將自動應用相關變更。請確認是否要繼續，以便順利完成操作。';

              case 'edit':
                return '您即將編輯設定流程，完成後系統將自動應用相關變更。請確認是否要繼續，以便順利完成操作。';

              default:
                return '';
            }
          })(),
          cancelText: '取消',
          confirmText: (() => {
            switch (mode) {
              case 'create':
                return '確認新增';

              case 'edit':
                return '套用變更';

              default:
                return '';
            }
          })(),
        });

        if (isConfirm) {
          methods.handleSubmit(onSubmit)();
          closeModalProps();
        }
      }
    } else {
      methods.handleSubmit(onSubmit)();
      closeModalProps();
    }
  }, [methods, mode, onSubmit, openDialog, submitWithConfirm, closeModalProps]);

  return (
    <Modal
      className={className}
      onClose={closeModal}
      showDismissButton
      modalType="standard"
      size={size}
      cancelText={cancelText}
      confirmText={confirmText}
      onCancel={closeModal}
      onConfirm={onConfirm}
      cancelButtonProps={{
        type: 'button',
        ...cancelButtonProps,
      }}
      confirmButtonProps={{
        type: 'button',
        ...confirmButtonProps,
      }}
      showStatusTypeIcon={false}
      statusTypeIconLayout="horizontal"
      title={title ?? ''}
      titleAlign="center"
      open={open}
      showModalFooter
      showModalHeader
    >
      <FormWrapper methods={methods}>{modalChildren}</FormWrapper>
    </Modal>
  );
};

export default FormModalWrapper;
