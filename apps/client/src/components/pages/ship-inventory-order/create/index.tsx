import { useForm } from 'react-hook-form';
import { NextPath } from '../../../../utils/nextpath';
import PageWrapper from '../../../PageWrapper';
import SectionWrapper from '../../../SectionWrapper';
import { FormWrapper } from '../../../fields/FormWrapper';

function CreateShipInventoryOrder() {
  const methods = useForm();

  return (
    <FormWrapper methods={methods} havePageFooter submitText="建立">
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
        <SectionWrapper title="單號資訊">section1</SectionWrapper>
        <SectionWrapper title="待建立列表">section2</SectionWrapper>
      </PageWrapper>
    </FormWrapper>
  );
}

export default CreateShipInventoryOrder;
