import { useCallback } from 'react';
import dayjs from 'dayjs';
import {
  Button,
  Description,
  DescriptionContent,
  SelectValue,
} from '@mezzanine-ui/react';
import { PlusIcon } from '@mezzanine-ui/icons';
import { NextPath } from '../../../../../utils/nextpath';
import PageWrapper from '../../../../PageWrapper';
import SectionWrapper from '../../../../SectionWrapper';
import { useFormCancel } from '../../../../../hooks/useFormCancel';
import classes from './index.module.scss';

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
      <SectionWrapper title="單號資訊">
        <div className={classes.headSectionWrapper}>
          <Description
            widthType="stretch"
            orientation="vertical"
            title="建立者"
          >
            <DescriptionContent>建立者</DescriptionContent>
          </Description>
          <Description
            widthType="stretch"
            orientation="vertical"
            title="接收者"
          >
            <DescriptionContent>接收者</DescriptionContent>
          </Description>
          <Description
            widthType="stretch"
            orientation="vertical"
            title="建立日期"
          >
            <DescriptionContent>建立日期</DescriptionContent>
          </Description>
        </div>
      </SectionWrapper>
      <SectionWrapper
        title="調撥項目"
        action={
          <Button type="button" size="sub" icon={PlusIcon} iconType="leading">
            新增調撥庫存
          </Button>
        }
      >
        section
      </SectionWrapper>
    </PageWrapper>
  );
}

export default TransferOrderFormBody;
