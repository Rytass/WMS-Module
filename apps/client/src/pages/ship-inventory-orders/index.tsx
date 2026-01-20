import ShipInventoryOrders from '../../components/pages/ship-inventory-orders';

function ShipInventoryOrdersPage() {
  return <ShipInventoryOrders />;
}

export const getServerSideProps = async () => {
  return {
    props: {},
  };
};

export default ShipInventoryOrdersPage;
