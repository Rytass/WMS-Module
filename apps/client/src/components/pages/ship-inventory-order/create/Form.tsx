import { NextPath } from '../../../../utils/nextpath';
import PageWrapper from '../../../PageWrapper';
import SectionWrapper from '../../../SectionWrapper';
import InputField from '../../../fields/InputField';
import { FormValues } from './typing';

interface CreateShipInventoryOrderFormProps {
  onSubmit: (values: FormValues) => Promise<void>;
}

function CreateShipInventoryOrderForm({
  onSubmit,
}: CreateShipInventoryOrderFormProps) {
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
      <SectionWrapper title="單號資訊">
        <InputField name="demo" label="demo" />
      </SectionWrapper>
      <SectionWrapper title="待建立列表">section</SectionWrapper>
    </PageWrapper>
  );
}

export default CreateShipInventoryOrderForm;
