import { ReactNode } from 'react';
import { ModalSize } from '@mezzanine-ui/react';

export interface ModalConfigType {
  size?: ModalSize;
  children?: ReactNode;
}
