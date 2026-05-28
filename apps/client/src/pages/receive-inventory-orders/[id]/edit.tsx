import { EditReceiveInventoryOrder } from '@rytass/wms-module-react';

function ReceiveInventoryOrderEditPage() {
  return <EditReceiveInventoryOrder />;
}

export const getServerSideProps = async () => {
  return {
    props: {},
  };
};

export default ReceiveInventoryOrderEditPage;
