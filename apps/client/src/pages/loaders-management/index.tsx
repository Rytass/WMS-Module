import LoadersManagement from '../../components/pages/loaders-management';

function LoadersManagementPage() {
  return <LoadersManagement />;
}

export const getServerSideProps = async () => {
  return {
    props: {},
  };
};

export default LoadersManagementPage;
