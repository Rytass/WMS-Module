import ReceiveInventoryOrders from '../../components/pages/receive-inventory-orders';

function ReceiveInventoryOrdersPage() {
  return <ReceiveInventoryOrders />;
}

export const getServerSideProps = async () => {
  return {
    props: {},
  };
};

export default ReceiveInventoryOrdersPage;
