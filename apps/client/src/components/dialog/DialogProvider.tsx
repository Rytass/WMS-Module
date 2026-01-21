/* eslint-disable @typescript-eslint/no-empty-function */
import { useCallback, useState, memo } from 'react';
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

  const openDialog = useCallback((config: DialogConfigType) => {
    setOpen(true);
    setDialogConfig(config);
  }, []);

  const handleCloseDialog = useCallback(async () => {
    setOpen(false);

    // Wait animation end then reset
    await new Promise((r) => setTimeout(r, 250));

    setDialogConfig({});
  }, []);

  const handleResolveActions = useCallback(
    (status: boolean) => {
      handleCloseDialog();
      resolve?.(status);
    },
    [handleCloseDialog, resolve],
  );

  return (
    <DialogContextProvider
      value={{
        closeDialog: handleCloseDialog,
        openDialog,
        resolve,
      }}
    >
      <>
        {children}
        <Modal
          className={className}
          onClose={() => {
            handleCloseDialog();
          }}
          showDismissButton
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
