import { useCallback } from 'react';
import { useFieldArray } from 'react-hook-form';
import { NextPath } from '../../../../../utils/nextpath';
import PageWrapper from '../../../../PageWrapper';
import SectionWrapper from '../../../../SectionWrapper';
import { useFormCancel } from '../../../../../hooks/useFormCancel';
import AddFields from './AddFields';
import FieldArrayTable from './FieldArrayTable';
import { AddFormValues } from './AddFields/typing';
import { FormValues } from './typing';

interface LoaderFormBodyProps {
  title: string;
  breadcrumbTitle: string;
}

function LoaderFormBody({ title, breadcrumbTitle }: LoaderFormBodyProps) {
  const onFormCancel = useFormCancel({});

  const { fields, append, remove } = useFieldArray<FormValues, 'items'>({
    name: 'items',
  });

  const onCreate = useCallback(
    (values: AddFormValues) => {
      append({
        ...values,
      });
    },
    [append],
  );

  return (
    <PageWrapper
      breadcrumb={[
        {
          label: '載具管理',
          href: NextPath.LOADERSMANAGEMENT,
        },
        {
          label: breadcrumbTitle,
        },
      ]}
      title={title}
      haveBack
      onBack={onFormCancel}
    >
      <SectionWrapper title="載具設定">
        <AddFields onCreate={onCreate} />
      </SectionWrapper>
      <SectionWrapper title="待建立列表">
        <FieldArrayTable fields={fields} remove={remove} />
      </SectionWrapper>
    </PageWrapper>
  );
}

export default LoaderFormBody;
