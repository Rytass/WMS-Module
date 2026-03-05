import { useCallback } from 'react';
import {
  Description,
  DescriptionContent,
  Badge,
  SelectValue,
} from '@mezzanine-ui/react';
import { useFieldArray } from 'react-hook-form';
import { NextPath } from '../../../../utils/nextpath';
import PageWrapper from '../../../PageWrapper';
import SectionWrapper from '../../../SectionWrapper';
import InputField from '../../../fields/InputField';
import { useFormCancel } from '../../../../hooks/useFormCancel';
import AddFields from './AddFields';
import FieldArrayTable from './FieldArrayTable';
import { AddFormValues } from './AddFields/typing';
import { FormValues } from './typing';
import classes from './index.module.scss';

interface ReceiveInventoryOrderFormBodyProps {
  title: string;
  breadcrumbTitle: string;
}

function ReceiveInventoryOrderFormBody({
  title,
  breadcrumbTitle,
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
      onBack={onFormCancel}
    >
      <SectionWrapper title="單號資訊">
        <div className={classes.headSectionWrapper}>
          <Description
            widthType="stretch"
            orientation="vertical"
            title="建立者"
          >
            <DescriptionContent>Ting</DescriptionContent>
          </Description>
          <Description
            widthType="stretch"
            orientation="vertical"
            title="建立日期"
          >
            <DescriptionContent>2025-12-25</DescriptionContent>
          </Description>
          <Description widthType="stretch" orientation="vertical" title="狀態">
            <Badge variant="dot-inactive" text="尚未執行" />
          </Description>
          <InputField name="remark" label="備註" placeholder="輸入備註" />
        </div>
      </SectionWrapper>
      <SectionWrapper title="列表">
        <AddFields onCreate={onCreate} />
        <FieldArrayTable fields={fields} update={update} remove={remove} />
      </SectionWrapper>
    </PageWrapper>
  );
}

export default ReceiveInventoryOrderFormBody;
