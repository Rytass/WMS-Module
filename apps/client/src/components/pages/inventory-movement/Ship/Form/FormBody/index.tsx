import { useCallback } from 'react';
import dayjs from 'dayjs';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  Typography,
  Description,
  DescriptionContent,
} from '@mezzanine-ui/react';
import { FormModalWrapper } from '../../../../../fields/FormModalWrapper';
import SectionWrapper from '../../../../../SectionWrapper';
import FieldArrayTable from './FieldArrayTable';
import { formSchema } from '../schema';
import { FormValues } from '../typing';
import classes from './index.module.scss';

interface InventoryMovementShipFormBodyProps {
  defaultValues: FormValues;
  orderKey: string;
  createdBy?: string | null;
  createdAt: string;
  description?: string;
  closeModal: VoidFunction;
  open: boolean;
}

function InventoryMovementShipFormBody({
  defaultValues,
  orderKey,
  createdBy,
  createdAt,
  description,
  closeModal,
  open,
}: InventoryMovementShipFormBodyProps) {
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
      title="出庫"
      titleAlign="left"
      confirmText="出庫"
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
              title="出庫單號"
            >
              <DescriptionContent>{orderKey}</DescriptionContent>
            </Description>
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
              title="建立時間"
            >
              <DescriptionContent>
                {dayjs(createdAt).format('YYYY-MM-DD')}
              </DescriptionContent>
            </Description>
            <Description
              widthType="stretch"
              orientation="vertical"
              title="備註"
            >
              <DescriptionContent>{description || '-'}</DescriptionContent>
            </Description>
          </div>
        </SectionWrapper>
        <Typography variant="h3" color="text-neutral-solid">
          庫存項目
        </Typography>
        <FieldArrayTable />
      </div>
    </FormModalWrapper>
  );
}

export default InventoryMovementShipFormBody;
