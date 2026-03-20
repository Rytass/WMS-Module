import Main from './Main';
import InventoryActionsProvider from '../../components/inventoryActions/InventoryActionsProvider';
import DialogProvider from '../../components/dialog/DialogProvider';
import ModalProvider from '../../components/modal/ModalProvider';

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
