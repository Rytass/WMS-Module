import MaterialsManagement from '../../components/pages/materials-management';

function MaterialsManagementPage() {
  return <MaterialsManagement />;
}

export const getServerSideProps = async () => {
  return {
    props: {},
  };
};

export default MaterialsManagementPage;
