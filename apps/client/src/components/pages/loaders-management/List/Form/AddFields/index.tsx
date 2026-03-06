import { useCallback, useState, useEffect } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { SelectValue, Message } from '@mezzanine-ui/react';
import { yupResolver } from '@hookform/resolvers/yup';
import FormActionButtons from '../../../../../FormActionButtons';
import { formSchema } from './schema';
import { AddFormValues } from './typing';
import classes from './index.module.scss';

const AddFields: FC = () => {
  const methods = useForm<AddFormValues>({
    resolver: yupResolver(formSchema),
  });

  const onSubmit = useCallback((values: AddFormValues) => {
    console.log('values', values);
  }, []);

  return (
    <FormProvider {...methods}>
      <div className={classes.host}>
        <div className={classes.fieldsWrapper}></div>
        <FormActionButtons
          onReset={() => {
            methods.reset();
          }}
          onClickSubmit={() => {
            methods.handleSubmit(onSubmit)();
          }}
          submitText="新增"
          submitButtonType="button"
        />
      </div>
    </FormProvider>
  );
};

export default AddFields;
