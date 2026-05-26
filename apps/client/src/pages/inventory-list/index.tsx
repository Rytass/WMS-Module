import { InventoryList } from "@rytass/wms-module-react";

function InventoryListPage() {
  return <InventoryList />;
}

export const getServerSideProps = async () => {
  return {
    props: {},
  };
};

export default InventoryListPage;
