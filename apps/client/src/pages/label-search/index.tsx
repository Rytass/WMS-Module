import LabelSearch from '../../components/pages/label-search';

function LabelSearchPage() {
  return <LabelSearch />;
}

export const getServerSideProps = async () => {
  return {
    props: {},
  };
};

export default LabelSearchPage;
