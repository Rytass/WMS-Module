import { ReactNode } from 'react';
import { ModalProps, ModalSize, Modal } from '@mezzanine-ui/react';
import { UseFormReturn, SubmitHandler, FieldValues } from 'react-hook-form';
import { FormWrapper } from '../FormWrapper';

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
  onCancel,
  onSubmit,
  children: modalChildren,
  closeModal,
  open,
}: FormModalWrapperProps<T>) => {
  return (
    <Modal
      className={className}
      onClose={() => {
        closeModal();
      }}
      showDismissButton
      modalType="standard"
      size={size}
      cancelText={cancelText}
      confirmText={confirmText}
      onCancel={(e) => {
        closeModal();
        onCancel?.(e);
      }}
      onConfirm={methods.handleSubmit(onSubmit)}
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
