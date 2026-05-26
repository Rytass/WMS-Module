import { EditShipInventoryOrder } from '@rytass/wms-module-react';

function ShipInventoryOrderEditPage() {
  return <EditShipInventoryOrder />;
}

export const getServerSideProps = async () => {
  return {
    props: {},
  };
};

export default ShipInventoryOrderEditPage;
