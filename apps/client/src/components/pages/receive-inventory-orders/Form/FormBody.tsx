import { useCallback } from 'react';
import {
  Description,
  DescriptionContent,
  SelectValue,
} from '@mezzanine-ui/react';
import { useFieldArray } from 'react-hook-form';
import { ReceiveInventoryOrderStatus } from '../../../../graphql/generated/.graphql';
import { NextPath } from '../../../../utils/nextpath';
import PageWrapper from '../../../PageWrapper';
import SectionWrapper from '../../../SectionWrapper';
import InputField from '../../../fields/InputField';
import { useFormCancel } from '../../../../hooks/useFormCancel';
import AddFields from './AddFields';
import FieldArrayTable from './FieldArrayTable';
import Status from '../Status';
import { AddFormValues } from './AddFields/typing';
import { FormValues } from './typing';
import classes from './index.module.scss';

interface ReceiveInventoryOrderFormBodyProps {
  title: string;
  breadcrumbTitle: string;
  description: string;
  createdBy: string;
  createdAt: string;
  status: ReceiveInventoryOrderStatus;
  viewMode: boolean;
}

function ReceiveInventoryOrderFormBody({
  title,
  breadcrumbTitle,
  description,
  createdBy,
  createdAt,
  status,
  viewMode,
}: ReceiveInventoryOrderFormBodyProps) {
  const onFormCancel = useFormCancel({});

  const { fields, append, update, remove } = useFieldArray<FormValues, 'items'>(
    {
      name: 'items',
    },
  );

  const onCreate = useCallback(
    (values: AddFormValues, unitOptions: SelectValue[]) => {
      append({
        ...values,
        receivedQuantity: 0,
        unitOptions,
        isExisted: false,
      });
    },
    [append],
  );

  return (
    <PageWrapper
      breadcrumb={[
        {
          label: '主檔管理',
          href: NextPath.RECEIVEINVENTORYORDERS,
        },
        {
          label: '入庫單',
          href: NextPath.RECEIVEINVENTORYORDERS,
        },
        {
          label: breadcrumbTitle,
        },
      ]}
      title={title}
      haveBack
      haveFooter={viewMode}
      onBack={viewMode ? undefined : onFormCancel}
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
            title="建立日期"
          >
            <DescriptionContent>{createdAt}</DescriptionContent>
          </Description>
          <Description widthType="stretch" orientation="vertical" title="狀態">
            <Status status={status} />
          </Description>
          {viewMode ? (
            <Description
              widthType="stretch"
              orientation="vertical"
              title="備註"
            >
              <DescriptionContent>{description}</DescriptionContent>
            </Description>
          ) : (
            <InputField name="remark" label="備註" placeholder="輸入備註" />
          )}
        </div>
      </SectionWrapper>
      <SectionWrapper title="列表">
        {!viewMode && <AddFields onCreate={onCreate} />}
        <FieldArrayTable
          viewMode={viewMode}
          fields={fields}
          update={update}
          remove={remove}
        />
      </SectionWrapper>
    </PageWrapper>
  );
}

export default ReceiveInventoryOrderFormBody;
