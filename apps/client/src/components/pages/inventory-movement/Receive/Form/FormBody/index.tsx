import { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Description, DescriptionContent } from '@mezzanine-ui/react';
import { FormModalWrapper } from '../../../../../fields/FormModalWrapper';
import SectionWrapper from '../../../../../SectionWrapper';
import { formSchema } from '../schema';
import { FormValues } from '../typing';
import classes from './index.module.scss';

interface InventoryMovementReceiveFormBodyProps {
  defaultValues: FormValues;
  closeModal: VoidFunction;
  open: boolean;
}

function InventoryMovementReceiveFormBody({
  defaultValues,
  closeModal,
  open,
}: InventoryMovementReceiveFormBodyProps) {
  const methods = useForm<FormValues>({
    resolver: yupResolver(formSchema),
    defaultValues,
  });

  const onSubmit = useCallback(async (values: FormValues) => {
    console.log('values', values);
  }, []);

  return (
    <FormModalWrapper<FormValues>
      methods={methods}
      title="入庫"
      titleAlign="left"
      confirmText="入庫"
      onSubmit={onSubmit}
      closeModal={closeModal}
      open={open}
      size="wide"
    >
      <div className={classes.host}>
        <SectionWrapper title="單號資訊" grayBackground>
          <div className={classes.headSectionWrapper}>
            <Description
              widthType="stretch"
              orientation="vertical"
              title="建立者"
            >
              <DescriptionContent>大胖丁</DescriptionContent>
            </Description>
            <Description
              widthType="stretch"
              orientation="vertical"
              title="建立者"
            >
              <DescriptionContent>大胖丁</DescriptionContent>
            </Description>
            <Description
              widthType="stretch"
              orientation="vertical"
              title="建立者"
            >
              <DescriptionContent>大胖丁</DescriptionContent>
            </Description>
            <Description
              widthType="stretch"
              orientation="vertical"
              title="建立者"
            >
              <DescriptionContent>大胖丁</DescriptionContent>
            </Description>
          </div>
        </SectionWrapper>
      </div>
    </FormModalWrapper>
  );
}

export default InventoryMovementReceiveFormBody;
