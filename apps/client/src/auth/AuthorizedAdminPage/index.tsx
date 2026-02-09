import Main from './Main';
import InventoryActionsProvider from '../../components/inventoryActions/InventoryActionsProvider';

const AuthorizedAdminPage: FC = ({ children }) => {
  return (
    <InventoryActionsProvider>
      <Main>{children}</Main>
    </InventoryActionsProvider>
  );
};

export default AuthorizedAdminPage;
