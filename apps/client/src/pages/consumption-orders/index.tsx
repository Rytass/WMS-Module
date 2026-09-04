import { ConsumptionOrders } from '@rytass/wms-module-react';

function ConsumptionOrdersPage() {
  return <ConsumptionOrders />;
}

export const getServerSideProps = async () => {
  return {
    props: {},
  };
};

export default ConsumptionOrdersPage;
