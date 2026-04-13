import { NextPath } from '../../../../../utils/nextpath';
import PageWrapper from '../../../../PageWrapper';
import SectionWrapper from '../../../../SectionWrapper';
import { useFormCancel } from '../../../../../hooks/useFormCancel';

interface TransferOrderFormBodyProps {
  title: string;
  breadcrumbTitle: string;
}

function TransferOrderFormBody({
  title,
  breadcrumbTitle,
}: TransferOrderFormBodyProps) {
  const onFormCancel = useFormCancel({});

  return (
    <PageWrapper
      breadcrumb={[
        {
          label: '庫存異動',
          href: NextPath.INVENTORYMOVEMENT,
        },
        {
          label: breadcrumbTitle,
        },
      ]}
      title={title}
      haveBack
      onBack={onFormCancel}
    >
      <SectionWrapper title="單號資訊">section</SectionWrapper>
    </PageWrapper>
  );
}

export default TransferOrderFormBody;
