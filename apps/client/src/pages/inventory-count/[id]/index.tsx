import { ViewInventoryCount } from '@rytass/wms-module-react';

function InventoryCountViewPage() {
  return <ViewInventoryCount />;
}

export const getServerSideProps = async () => {
  return {
    props: {},
  };
};

export default InventoryCountViewPage;
