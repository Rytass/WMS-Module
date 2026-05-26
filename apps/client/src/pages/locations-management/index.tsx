import { LocationsManagement } from "@rytass/wms-module-react";

function LocationsManagementPage() {
  return <LocationsManagement />;
}

export const getServerSideProps = async () => {
  return {
    props: {},
  };
};

export default LocationsManagementPage;
