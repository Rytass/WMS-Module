import { MaterialsManagement } from "@rytass/wms-module-react";

function MaterialsManagementPage() {
  return <MaterialsManagement />;
}

export const getServerSideProps = async () => {
  return {
    props: {},
  };
};

export default MaterialsManagementPage;
