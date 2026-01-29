import Maps from '../../components/pages/maps';

function MapsPage() {
  return <Maps />;
}

export const getServerSideProps = async () => {
  return {
    props: {},
  };
};

export default MapsPage;
