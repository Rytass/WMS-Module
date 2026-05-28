import { Maps } from "@rytass/wms-module-react";

function MapsPage() {
  return <Maps />;
}

export const getServerSideProps = async () => {
  return {
    props: {},
  };
};

export default MapsPage;
