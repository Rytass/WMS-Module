import { ReactElement } from 'react';
import {
  ModalProps,
  ModalHeaderProps,
  ModalActionsProps,
} from '@mezzanine-ui/react';

export type OpenDialogFunctionType = (
  config: DialogConfigType,
) => Promise<boolean>;

export interface DialogConfigType
  extends ModalProps,
    ModalHeaderProps,
    ModalActionsProps {
  children?: string[] | string | ReactElement;
  disableActions?: boolean;
  resolve?: (value: boolean) => void;
}
