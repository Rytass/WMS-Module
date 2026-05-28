import { EditTransferOrder } from '@rytass/wms-module-react';

function TransferOrderEditPage() {
  return <EditTransferOrder />;
}

export const getServerSideProps = async () => {
  return {
    props: {},
  };
};

export default TransferOrderEditPage;
