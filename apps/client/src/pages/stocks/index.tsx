import Stocks from '../../components/pages/stocks';

function StocksPage() {
  return <Stocks />;
}

export const getServerSideProps = async () => {
  return {
    props: {},
  };
};

export default StocksPage;
