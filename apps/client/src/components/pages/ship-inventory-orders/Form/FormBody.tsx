import { NextPath } from '../../../../utils/nextpath';
import PageWrapper from '../../../PageWrapper';
import SectionWrapper from '../../../SectionWrapper';
import InputField from '../../../fields/InputField';
import { useFormCancel } from '../../../../hooks/useFormCancel';
import classes from './index.module.scss';

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
        <div className={classes.headSectionWrapper}>
          <div>1</div>
          <div>2</div>
          <div>3</div>
          <InputField name="remark" label="備註" placeholder="輸入備註" />
        </div>
      </SectionWrapper>
      <SectionWrapper title="待建立列表">section</SectionWrapper>
    </PageWrapper>
  );
}

export default ShipInventoryOrderFormBody;
