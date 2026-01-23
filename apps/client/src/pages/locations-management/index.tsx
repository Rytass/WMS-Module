import LocationsManagement from '../../components/pages/locations-management';

function LocationsManagementPage() {
  return <LocationsManagement />;
}

export const getServerSideProps = async () => {
  return {
    props: {},
  };
};

export default LocationsManagementPage;
