import { ShipInventoryOrders } from "@rytass/wms-module-react";

function ShipInventoryOrdersPage() {
  return <ShipInventoryOrders />;
}

export const getServerSideProps = async () => {
  return {
    props: {},
  };
};

export default ShipInventoryOrdersPage;
