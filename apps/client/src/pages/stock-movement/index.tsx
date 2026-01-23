import StockMovement from '../../components/pages/stock-movement';

function StockMovementPage() {
  return <StockMovement />;
}

export const getServerSideProps = async () => {
  return {
    props: {},
  };
};

export default StockMovementPage;
