import ViewReceiveInventoryOrder from '../../../components/pages/receive-inventory-orders/view';

function ReceiveInventoryOrderViewPage() {
  return <ViewReceiveInventoryOrder />;
}

export const getServerSideProps = async () => {
  return {
    props: {},
  };
};

export default ReceiveInventoryOrderViewPage;
