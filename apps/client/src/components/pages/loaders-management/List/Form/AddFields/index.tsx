import { useCallback, useState, useEffect } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { SelectValue, Message } from '@mezzanine-ui/react';
import { yupResolver } from '@hookform/resolvers/yup';
import InputField from '../../../../../fields/InputField';
import NumberInputField from '../../../../../fields/NumberInputField';
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
        <div className={classes.fieldsWrapper}>
          <div className={classes.baseFieldsWrapper}>
            <div>1</div>
            <div>1</div>
            <div>1</div>
            <NumberInputField
              name="quantity"
              label="數量"
              placeholder="輸入數量"
              required
            />
          </div>
          <div className={classes.sizeFieldsWrapper}>
            <NumberInputField
              name="length"
              label="長度"
              placeholder="輸入長度"
            />
            <NumberInputField
              name="width"
              label="寬度"
              placeholder="輸入寬度"
            />
            <NumberInputField
              name="height"
              label="高度"
              placeholder="輸入高度"
            />
            <div>1</div>
            <NumberInputField
              name="volume"
              label="容積"
              placeholder="輸入容積"
            />
            <div>1</div>
          </div>
          <InputField name="remark" placeholder="輸入備註" label="備註" />
        </div>
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
