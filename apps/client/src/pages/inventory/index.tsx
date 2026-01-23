import Inventory from '../../components/pages/inventory';

function InventoryPage() {
  return <Inventory />;
}

export const getServerSideProps = async () => {
  return {
    props: {},
  };
};

export default InventoryPage;
