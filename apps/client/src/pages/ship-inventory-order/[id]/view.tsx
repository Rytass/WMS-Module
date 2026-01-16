import ViewShipInventoryOrder from '../../../components/pages/ship-inventory-order/view';

function ShipInventoryOrderViewPage() {
  return <ViewShipInventoryOrder />;
}

export const getServerSideProps = async () => {
  return {
    props: {},
  };
};

export default ShipInventoryOrderViewPage;
