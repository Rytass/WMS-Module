/* eslint-disable @typescript-eslint/no-empty-function */
import { createContext } from 'react';
import { ModalConfigType } from './typing';

export interface ModalContextValues {
  open: boolean;
  openModal: (config: ModalConfigType) => void;
  closeModal: () => Promise<void>;
}

export const ModalContext = createContext<ModalContextValues>({
  open: false,
  openModal: () => {},
  closeModal: async () => {},
});

export const ModalContextProvider = ModalContext.Provider;
