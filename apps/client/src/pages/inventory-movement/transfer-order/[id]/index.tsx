import EditTransferOrder from '../../../../components/pages/inventory-movement/transfer-order';

function TransferOrderEditPage() {
  return <EditTransferOrder />;
}

export const getServerSideProps = async () => {
  return {
    props: {},
  };
};

export default TransferOrderEditPage;
