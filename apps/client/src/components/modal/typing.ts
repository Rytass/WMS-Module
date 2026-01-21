import { ReactNode } from 'react';
import { ModalProps, ModalSize } from '@mezzanine-ui/react';
import { UseFormReturn, SubmitHandler, FieldValues } from 'react-hook-form';

export type ModalConfigType<T extends FieldValues = FieldValues> = Omit<
  ModalProps,
  'modalType' | 'onSubmit'
> & {
  size?: ModalSize;
  methods?: UseFormReturn<T>;
  onSubmit?: SubmitHandler<T>;
  children?: ReactNode;
};
