import { LoadersManagement } from "@rytass/wms-module-react";

function LoadersManagementPage() {
  return <LoadersManagement />;
}

export const getServerSideProps = async () => {
  return {
    props: {},
  };
};

export default LoadersManagementPage;
