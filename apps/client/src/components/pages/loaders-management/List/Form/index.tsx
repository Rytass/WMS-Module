import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { FormWrapper } from '../../../../fields/FormWrapper';
import LoaderFormBody from './FormBody';
import { formSchema } from './schema';
import { FormValues } from './typing';

interface LoaderFormProps {
  defaultValues: FormValues;
  onSubmit: (values: FormValues) => Promise<void>;
  title: string;
  breadcrumbTitle: string;
  submitText: string;
}

function LoaderForm({
  defaultValues,
  onSubmit,
  title,
  breadcrumbTitle,
  submitText,
}: LoaderFormProps) {
  const methods = useForm<FormValues>({
    resolver: yupResolver(formSchema),
    defaultValues,
  });

  return (
    <FormWrapper
      methods={methods}
      havePageFooter
      submitText={submitText}
      onSubmit={onSubmit}
      pureFormProvider
    >
      <LoaderFormBody title={title} breadcrumbTitle={breadcrumbTitle} />
    </FormWrapper>
  );
}

export default LoaderForm;
