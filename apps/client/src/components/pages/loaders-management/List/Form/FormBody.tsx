import { NextPath } from '../../../../../utils/nextpath';
import PageWrapper from '../../../../PageWrapper';
import SectionWrapper from '../../../../SectionWrapper';
import InputField from '../../../../fields/InputField';
import { useFormCancel } from '../../../../../hooks/useFormCancel';
import FormActionButtons from '../../../../FormActionButtons';
import classes from './index.module.scss';

interface LoaderFormBodyProps {
  title: string;
  breadcrumbTitle: string;
}

function LoaderFormBody({ title, breadcrumbTitle }: LoaderFormBodyProps) {
  const onFormCancel = useFormCancel({});

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
        <div className={classes.fieldsSection}>
          <div className={classes.fieldsWrapper}>
            <InputField name="remark" label="備註" placeholder="輸入備註" />
          </div>
          <FormActionButtons
            onReset={() => {
              console.log('reset');
            }}
            onClickSubmit={() => {
              console.log('create');
            }}
            submitText="新增"
            submitButtonType="button"
          />
        </div>
      </SectionWrapper>
      <SectionWrapper title="待建立列表">section</SectionWrapper>
    </PageWrapper>
  );
}

export default LoaderFormBody;
