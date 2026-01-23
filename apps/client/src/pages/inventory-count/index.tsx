import InventoryCount from '../../components/pages/inventory-count';

function InventoryCountPage() {
  return <InventoryCount />;
}

export const getServerSideProps = async () => {
  return {
    props: {},
  };
};

export default InventoryCountPage;
