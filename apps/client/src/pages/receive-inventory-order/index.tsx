import ReceiveInventoryOrder from '../../components/pages/receive-inventory-order';

function ReceiveInventoryOrderPage() {
  return <ReceiveInventoryOrder />;
}

export const getServerSideProps = async () => {
  return {
    props: {},
  };
};

export default ReceiveInventoryOrderPage;
