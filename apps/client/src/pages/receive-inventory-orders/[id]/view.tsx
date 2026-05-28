import { ViewReceiveInventoryOrder } from '@rytass/wms-module-react';

function ReceiveInventoryOrderViewPage() {
  return <ViewReceiveInventoryOrder />;
}

export const getServerSideProps = async () => {
  return {
    props: {},
  };
};

export default ReceiveInventoryOrderViewPage;
