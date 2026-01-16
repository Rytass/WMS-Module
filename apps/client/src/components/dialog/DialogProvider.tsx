/* eslint-disable @typescript-eslint/no-empty-function */
import { useState, memo } from 'react';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalActions,
  cx,
} from '@mezzanine-ui/react';
import { DialogContextProvider } from './DialogContext';
import { DialogConfigType } from './typing';
import classes from './index.module.scss';

const DialogProvider: FC = ({ children }) => {
  const [open, setOpen] = useState<boolean>(false);

  const [dialogConfig, setDialogConfig] = useState<DialogConfigType>({});

  const {
    className,
    resolve = () => {},
    titleLarge,
    title,
    children: dialogChildren,
    disableActions,
    cancelButtonProps,
    cancelText = '取消',
    confirmButtonProps,
    confirmText = '確認',
    ...rest
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
          {...rest}
          disableCloseOnBackdropClick={false}
          hideCloseIcon={false}
          onClose={() => {
            handleCloseDialog();
          }}
          open={open}
          className={cx(classes.host, className)}
        >
          <ModalHeader
            showSeverityIcon={false}
            titleLarge={titleLarge}
            className={classes.modalHeader}
          >
            {title}
          </ModalHeader>
          <ModalBody>
            <div className={classes.warningWrapper}>{dialogChildren}</div>
          </ModalBody>
          {!disableActions && (
            <ModalActions
              cancelText={cancelText}
              confirmText={confirmText}
              cancelButtonProps={{
                type: 'button',
                size: 'sub',
                style: {
                  width: 120,
                },
                ...cancelButtonProps,
              }}
              confirmButtonProps={{
                type: 'button',
                size: 'sub',
                style: {
                  width: 120,
                },
                ...confirmButtonProps,
              }}
              onCancel={() => {
                handleResolveActions(false);
              }}
              onConfirm={() => {
                handleResolveActions(true);
              }}
            />
          )}
        </Modal>
      </>
    </DialogContextProvider>
  );
};

export default memo(DialogProvider);
