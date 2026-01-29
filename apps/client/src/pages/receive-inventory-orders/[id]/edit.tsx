import EditReceiveInventoryOrder from '../../../components/pages/receive-inventory-orders/edit';

function ReceiveInventoryOrderEditPage() {
  return <EditReceiveInventoryOrder />;
}

export const getServerSideProps = async () => {
  return {
    props: {},
  };
};

export default ReceiveInventoryOrderEditPage;
