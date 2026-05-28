import { LabelSearch } from "@rytass/wms-module-react";

function LabelSearchPage() {
  return <LabelSearch />;
}

export const getServerSideProps = async () => {
  return {
    props: {},
  };
};

export default LabelSearchPage;
