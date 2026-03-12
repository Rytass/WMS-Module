import { useCallback, useState, memo } from 'react';
import { Modal } from '@mezzanine-ui/react';
import { ModalContextProvider } from './ModalContext';
import { ModalConfigType } from './typing';

const ModalProvider: FC = ({ children }) => {
  const [open, setOpen] = useState<boolean>(false);

  const [modalConfig, setModalConfig] = useState<ModalConfigType>({});

  const {
    className,
    title,
    titleAlign = 'center',
    size = 'regular',
    cancelButtonProps,
    confirmButtonProps,
    cancelText = '取消',
    confirmText = '確認',
    onConfirm,
    children: modalChildren,
  } = modalConfig;

  const openModal = useCallback((config: ModalConfigType) => {
    setOpen(true);
    setModalConfig(config);
  }, []);

  const closeModal = useCallback(async () => {
    setOpen(false);

    // Wait animation end then reset
    await new Promise((r) => setTimeout(r, 250));

    setModalConfig({});
  }, []);

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
          titleAlign={titleAlign}
          open={open}
          showModalFooter
          showModalHeader
        >
          {modalChildren}
        </Modal>
      </>
    </ModalContextProvider>
  );
};

export default memo(ModalProvider);
