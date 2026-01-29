import InventoryList from '../../components/pages/inventory-list';

function InventoryListPage() {
  return <InventoryList />;
}

export const getServerSideProps = async () => {
  return {
    props: {},
  };
};

export default InventoryListPage;
