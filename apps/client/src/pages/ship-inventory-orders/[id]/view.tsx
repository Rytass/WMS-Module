import { ViewShipInventoryOrder } from '@rytass/wms-module-react';

function ShipInventoryOrderViewPage() {
  return <ViewShipInventoryOrder />;
}

export const getServerSideProps = async () => {
  return {
    props: {},
  };
};

export default ShipInventoryOrderViewPage;
