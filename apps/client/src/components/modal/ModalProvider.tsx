/* eslint-disable @typescript-eslint/no-empty-function */
import { useCallback, useState, memo } from 'react';
import { Modal } from '@mezzanine-ui/react';
import { ModalContextProvider } from './ModalContext';
import { ModalConfigType } from './typing';

const ModalProvider: FC = ({ children }) => {
  const [open, setOpen] = useState<boolean>(false);

  const [modalConfig, setModalConfig] = useState<ModalConfigType>({});

  const { size = 'regular', children: modalChildren } = modalConfig;

  const openModal = useCallback((config: ModalConfigType) => {
    setOpen(true);
    setModalConfig(config);
  }, []);

  const closeModal = useCallback(async () => {
    setOpen(false);

    // Wait animation end then reset
    await new Promise((r) => setTimeout(r, 250));

    setModalConfig({});
  }, []);

  return (
    <ModalContextProvider
      value={{
        open,
        closeModal,
        openModal,
      }}
    >
      <>{children}</>
    </ModalContextProvider>
  );
};

export default memo(ModalProvider);
