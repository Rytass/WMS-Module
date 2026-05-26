import { InventoryMovement } from "@rytass/wms-module-react";

function InventoryMovementPage() {
  return <InventoryMovement />;
}

export const getServerSideProps = async () => {
  return {
    props: {},
  };
};

export default InventoryMovementPage;
