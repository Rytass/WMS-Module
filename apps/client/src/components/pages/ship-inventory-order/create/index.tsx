import { NextPath } from '../../../../utils/nextpath';
import PageWrapper from '../../../PageWrapper';

function CreateShipInventoryOrder() {
  return (
    <PageWrapper
      breadcrumb={[
        {
          label: '主檔管理',
          href: NextPath.SHIPINVENTORYORDER,
        },
        {
          label: '出庫單',
          href: NextPath.SHIPINVENTORYORDER,
        },
        {
          label: '建立出庫單',
        },
      ]}
      title="建立出庫單"
      haveBack
    >
      Create
    </PageWrapper>
  );
}

export default CreateShipInventoryOrder;
