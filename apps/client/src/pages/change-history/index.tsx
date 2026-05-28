import { ChangeHistory } from "@rytass/wms-module-react";

function ChangeHistoryPage() {
  return <ChangeHistory />;
}

export const getServerSideProps = async () => {
  return {
    props: {},
  };
};

export default ChangeHistoryPage;
