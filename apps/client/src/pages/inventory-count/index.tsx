import { InventoryCount } from "@rytass/wms-module-react";

function InventoryCountPage() {
  return <InventoryCount />;
}

export const getServerSideProps = async () => {
  return {
    props: {},
  };
};

export default InventoryCountPage;
