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
  closeModal,
  open,
  mode,
  submitWithConfirm = false,
  cancelWithConfirm = false,
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
      onCancel={() => {
        closeModal();
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
