import Main from './Main';
import {
  DialogProvider,
  InventoryActionsProvider,
  ModalProvider,
} from '@rytass/wms-module-react';

const AuthorizedAdminPage: FC = ({ children }) => {
  return (
    <InventoryActionsProvider>
      <DialogProvider>
        <ModalProvider>
          <Main>{children}</Main>
        </ModalProvider>
      </DialogProvider>
    </InventoryActionsProvider>
  );
};

export default AuthorizedAdminPage;
