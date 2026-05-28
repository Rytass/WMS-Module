import { ReceiveInventoryOrders } from "@rytass/wms-module-react";

function ReceiveInventoryOrdersPage() {
  return <ReceiveInventoryOrders />;
}

export const getServerSideProps = async () => {
  return {
    props: {},
  };
};

export default ReceiveInventoryOrdersPage;
