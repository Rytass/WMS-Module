import { NextPath } from '../../../../utils/nextpath';
import PageWrapper from '../../../PageWrapper';
import SectionWrapper from '../../../SectionWrapper';
import InputField from '../../../fields/InputField';
import { useFormCancel } from '../../../../hooks/useFormCancel';
import { FormValues } from './typing';

interface ShipInventoryOrderFormBodyProps {
  onSubmit: (values: FormValues) => Promise<void>;
  title: string;
  breadcrumbTitle: string;
}

function ShipInventoryOrderFormBody({
  onSubmit,
  title,
  breadcrumbTitle,
}: ShipInventoryOrderFormBodyProps) {
  const onFormCancel = useFormCancel<FormValues>({
    onSubmit,
  });

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
