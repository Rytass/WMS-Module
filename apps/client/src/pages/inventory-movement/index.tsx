import InventoryMovement from '../../components/pages/inventory-movement';

function InventoryMovementPage() {
  return <InventoryMovement />;
}

export const getServerSideProps = async () => {
  return {
    props: {},
  };
};

export default InventoryMovementPage;
