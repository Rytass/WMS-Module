import { useCallback, useState } from 'react';
import dayjs from 'dayjs';
import { Button, Description, DescriptionContent } from '@mezzanine-ui/react';
import { PlusIcon } from '@mezzanine-ui/icons';
import { NextPath } from '../../../../../utils/nextpath';
import PageWrapper from '../../../../PageWrapper';
import SectionWrapper from '../../../../SectionWrapper';
import { useFormCancel } from '../../../../../hooks/useFormCancel';
import LocationsField from '../../../../fields/LocationsField';
import LoadersField from '../../../../fields/LoadersField';
import InputField from '../../../../fields/InputField';
import TableModal from '../TableModal';
import classes from './index.module.scss';

interface TransferOrderFormBodyProps {
  title: string;
  breadcrumbTitle: string;
  createdBy?: string | null;
  receiver?: string | null;
  createdAt: string;
}

function TransferOrderFormBody({
  title,
  breadcrumbTitle,
  createdBy,
  receiver,
  createdAt,
}: TransferOrderFormBodyProps) {
  const [modalOpened, setModalOpened] = useState<boolean>(false);
  const onFormCancel = useFormCancel({});

  return (
    <>
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
              <DescriptionContent>{createdBy || '-'}</DescriptionContent>
            </Description>
            <Description
              widthType="stretch"
              orientation="vertical"
              title="接收者"
            >
              <DescriptionContent>{receiver || '-'}</DescriptionContent>
            </Description>
            <Description
              widthType="stretch"
              orientation="vertical"
              title="建立日期"
            >
              <DescriptionContent>
                {dayjs(createdAt).format('YYYY-MM-DD HH:mm')}
              </DescriptionContent>
            </Description>
            <LocationsField
              name="targetLocation"
              label="目標位置"
              fuzzySearch={false}
              selectValueMode
            />
            <LoadersField
              name="targetLoader"
              label="目標載具"
              fuzzySearch={false}
              selectValueMode
            />
            <InputField
              name="description"
              label="備註"
              placeholder="輸入備註"
            />
          </div>
        </SectionWrapper>
        <SectionWrapper
          title="調撥項目"
          action={
            <Button
              type="button"
              size="sub"
              icon={PlusIcon}
              iconType="leading"
              onClick={() => {
                setModalOpened(true);
              }}
            >
              新增調撥庫存
            </Button>
          }
        >
          section
        </SectionWrapper>
      </PageWrapper>
      <TableModal
        open={modalOpened}
        closeModal={() => {
          setModalOpened(false);
        }}
      />
    </>
  );
}

export default TransferOrderFormBody;
