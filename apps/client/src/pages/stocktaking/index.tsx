import Stocktaking from '../../components/pages/stocktaking';

function StocktakingPage() {
  return <Stocktaking />;
}

export const getServerSideProps = async () => {
  return {
    props: {},
  };
};

export default StocktakingPage;
