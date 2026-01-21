import { NextPath } from '../../../../utils/nextpath';
import PageWrapper from '../../../PageWrapper';
import SectionWrapper from '../../../SectionWrapper';
import InputField from '../../../fields/InputField';
import { useFormCancel } from '../../../../hooks/useFormCancel';

interface ShipInventoryOrderFormBodyProps {
  title: string;
  breadcrumbTitle: string;
}

function ShipInventoryOrderFormBody({
  title,
  breadcrumbTitle,
}: ShipInventoryOrderFormBodyProps) {
  const onFormCancel = useFormCancel({});

  return (
    <PageWrapper
      breadcrumb={[
        {
          label: '主檔管理',
          href: NextPath.SHIPINVENTORYORDERS,
        },
        {
          label: '出庫單',
          href: NextPath.SHIPINVENTORYORDERS,
        },
        {
          label: breadcrumbTitle,
        },
      ]}
      title={title}
      haveBack
      onBack={onFormCancel}
    >
      <SectionWrapper title="單號資訊">
        <InputField name="demo" label="demo" />
      </SectionWrapper>
      <SectionWrapper title="待建立列表">section</SectionWrapper>
    </PageWrapper>
  );
}

export default ShipInventoryOrderFormBody;
