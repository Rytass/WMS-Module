import { ReactElement } from 'react';
import { ModalProps } from '@mezzanine-ui/react';

export type DialogConfigType = Omit<ModalProps, 'modalType'> & {
  children?: string[] | string | ReactElement;
  resolve?: (value: boolean) => void;
};

export type OpenDialogFunctionType = (
  config: DialogConfigType,
) => Promise<boolean>;
