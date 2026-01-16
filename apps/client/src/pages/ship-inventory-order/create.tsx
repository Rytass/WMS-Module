import CreateShipInventoryOrder from '../../components/pages/ship-inventory-order/create';

function ShipInventoryOrderCreatePage() {
  return <CreateShipInventoryOrder />;
}

export const getServerSideProps = async () => {
  return {
    props: {},
  };
};

export default ShipInventoryOrderCreatePage;
