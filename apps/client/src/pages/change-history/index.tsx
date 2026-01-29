import ChangeHistory from '../../components/pages/change-history';

function ChangeHistoryPage() {
  return <ChangeHistory />;
}

export const getServerSideProps = async () => {
  return {
    props: {},
  };
};

export default ChangeHistoryPage;
