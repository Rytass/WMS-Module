import ViewShipInventoryOrder from '../../../components/pages/ship-inventory-orders/view';

function ShipInventoryOrderViewPage() {
  return <ViewShipInventoryOrder />;
}

export const getServerSideProps = async () => {
  return {
    props: {},
  };
};

export default ShipInventoryOrderViewPage;
