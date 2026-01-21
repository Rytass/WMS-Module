import { useCallback, useState, memo, MouseEventHandler } from 'react';
import { Modal } from '@mezzanine-ui/react';
import { FieldValues } from 'react-hook-form';
import { ModalContextProvider } from './ModalContext';
import { FormWrapper } from '../fields/FormWrapper';
import { ModalConfigType } from './typing';

const ModalProvider: FC = ({ children }) => {
  const [open, setOpen] = useState<boolean>(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [modalConfig, setModalConfig] = useState<ModalConfigType<any>>({});

  const {
    methods,
    className,
    title,
    size = 'regular',
    cancelButtonProps,
    confirmButtonProps,
    cancelText = '取消',
    confirmText = '確認',
    onCancel,
    onConfirm: onConfirmProps,
    onSubmit,
    children: modalChildren,
  } = modalConfig;

  const openModal = useCallback(
    <T extends FieldValues>(config: ModalConfigType<T>) => {
      setOpen(true);
      setModalConfig(config);
    },
    [],
  );

  const closeModal = useCallback(async () => {
    setOpen(false);

    // Wait animation end then reset
    await new Promise((r) => setTimeout(r, 250));

    setModalConfig({});
  }, []);

  const renderModal = useCallback(
    (onConfirm: MouseEventHandler<HTMLButtonElement> | undefined) => (
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
        {modalChildren}
      </Modal>
    ),
    [
      cancelButtonProps,
      cancelText,
      className,
      closeModal,
      confirmButtonProps,
      confirmText,
      modalChildren,
      onCancel,
      open,
      size,
      title,
    ],
  );

  console.log('methods', methods);

  return (
    <ModalContextProvider
      value={{
        open,
        closeModal,
        openModal,
      }}
    >
      <>
        {children}
        {methods ? (
          <FormWrapper methods={methods}>
            {renderModal(
              onSubmit ? methods.handleSubmit(onSubmit) : onConfirmProps,
            )}
          </FormWrapper>
        ) : (
          <>{renderModal(onConfirmProps)}</>
        )}
      </>
    </ModalContextProvider>
  );
};

export default memo(ModalProvider);
