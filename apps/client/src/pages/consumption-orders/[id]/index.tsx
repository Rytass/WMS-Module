import { ViewConsumptionOrder } from '@rytass/wms-module-react';

function ConsumptionOrderViewPage() {
  return <ViewConsumptionOrder />;
}

export const getServerSideProps = async () => {
  return {
    props: {},
  };
};

export default ConsumptionOrderViewPage;
