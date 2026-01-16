import ShipInventoryOrder from '../../components/pages/ship-inventory-order';

function ShipInventoryOrderPage() {
  return <ShipInventoryOrder />;
}

export const getServerSideProps = async () => {
  return {
    props: {},
  };
};

export default ShipInventoryOrderPage;
