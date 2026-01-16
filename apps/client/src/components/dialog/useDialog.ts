import { useContext } from 'react';
import { DialogContext, DialogContextValues } from './DialogContext';

export const useDialog = (): DialogContextValues => {
  const {
    openDialog: configOpenDialog,
    closeDialog,
    resolve,
  } = useContext(DialogContext);

  const openDialog = ({ ...options }) =>
    new Promise<boolean>((resolver) => {
      configOpenDialog({
        resolve: resolver,
        ...options,
      });
    });

  return {
    openDialog,
    closeDialog,
    resolve,
  };
};
