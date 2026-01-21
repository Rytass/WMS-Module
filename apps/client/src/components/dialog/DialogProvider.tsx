/* eslint-disable @typescript-eslint/no-empty-function */
import { useState, memo } from 'react';
import { Modal } from '@mezzanine-ui/react';
import { DialogContextProvider } from './DialogContext';
import { DialogConfigType } from './typing';

const DialogProvider: FC = ({ children }) => {
  const [open, setOpen] = useState<boolean>(false);

  const [dialogConfig, setDialogConfig] = useState<DialogConfigType>({});

  const {
    className,
    resolve = () => {},
    title,
    children: dialogChildren,
    supportingText,
    modalStatusType = 'warning',
    cancelButtonProps,
    cancelText = '取消',
    confirmButtonProps,
    confirmText = '確認',
  } = dialogConfig;

  const openDialog = (config: DialogConfigType) => {
    setOpen(true);
    setDialogConfig(config);
  };

  const handleCloseDialog = async () => {
    setOpen(false);

    // Wait animation end then reset
    await new Promise((r) => setTimeout(r, 200));

    setDialogConfig({});
  };

  const handleResolveActions = (status: boolean) => {
    handleCloseDialog();
    resolve?.(status);
  };

  return (
    <DialogContextProvider
      value={{
        closeDialog: () => {
          handleCloseDialog();
        },
        openDialog,
        resolve,
      }}
    >
      <>
        {children}
        <Modal
          className={className}
          modalType="standard"
          size="narrow"
          supportingText={supportingText}
          cancelText={cancelText}
          confirmText={confirmText}
          onCancel={() => {
            handleResolveActions(false);
          }}
          onConfirm={() => {
            handleResolveActions(true);
          }}
          cancelButtonProps={{
            type: 'button',
            ...cancelButtonProps,
          }}
          confirmButtonProps={{
            type: 'button',
            ...confirmButtonProps,
          }}
          showStatusTypeIcon
          statusTypeIconLayout="horizontal"
          title={title ?? ''}
          modalStatusType={modalStatusType}
          onClose={() => {
            handleCloseDialog();
          }}
          open={open}
          showModalFooter
          showModalHeader
        >
          {dialogChildren}
        </Modal>
      </>
    </DialogContextProvider>
  );
};

export default memo(DialogProvider);
