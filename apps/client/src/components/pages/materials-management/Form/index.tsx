import { useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useModal } from '../../../modal/useModal';
import { FormWrapper } from '../../../fields/FormWrapper';
import InputField from '../../../fields/InputField';
import { formSchema } from './schema';
import { FormValues } from './typing';

export function useMaterialsManagementForm({
  onSubmit,
}: {
  onSubmit: (values: FormValues) => Promise<void>;
}) {
  const { openModal } = useModal();

  const methods = useForm<FormValues>({
    resolver: yupResolver(formSchema),
    defaultValues: {
      demo: '',
    },
  });

  const formBody = useMemo(
    () => (
      <>
        <InputField name="demo" label="demo" />
      </>
    ),
    [],
  );

  const onCreate = useCallback(() => {
    openModal<FormValues>({
      title: '新增料號',
      confirmText: '新增',
      children: formBody,
      methods,
      onSubmit,
    });
  }, [formBody, methods, onSubmit, openModal]);

  return { onCreate };
}
