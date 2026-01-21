import { ReactNode } from 'react';
import { ModalProps, ModalSize } from '@mezzanine-ui/react';

export type ModalConfigType = Omit<ModalProps, 'modalType'> & {
  size?: ModalSize;
  children?: ReactNode;
};
