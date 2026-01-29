import EditShipInventoryOrder from '../../../components/pages/ship-inventory-orders/edit';

function ShipInventoryOrderEditPage() {
  return <EditShipInventoryOrder />;
}

export const getServerSideProps = async () => {
  return {
    props: {},
  };
};

export default ShipInventoryOrderEditPage;
