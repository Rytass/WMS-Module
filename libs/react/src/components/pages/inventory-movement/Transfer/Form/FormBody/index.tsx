import { useCallback } from 'react';
import dayjs from 'dayjs';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  Typography,
  Description,
  DescriptionContent,
  SelectValue,
  Message,
} from '@mezzanine-ui/react';
import { FormModalWrapper } from '../../../../../fields/FormModalWrapper';
import SectionWrapper from '../../../../../SectionWrapper';
import FieldArrayTable from './FieldArrayTable';
import { formSchema } from '../schema';
import { FormValues } from '../typing';
import { useTransfer } from '../../../useApi';
import classes from './index.module.scss';

interface InventoryMovementTransferFormBodyProps {
  defaultValues: FormValues;
  orderKey: string;
  createdBy?: string | null;
  receiver?: string | null;
  createdAt: string;
  targetLocation?: SelectValue | null;
  targetLoader?: SelectValue | null;
  description?: string;
  closeModal: VoidFunction;
  open: boolean;
}

function InventoryMovementTransferFormBody({
  defaultValues,
  orderKey,
  createdBy,
  receiver,
  createdAt,
  targetLocation,
  targetLoader,
  description,
  closeModal,
  open,
}: InventoryMovementTransferFormBodyProps) {
  const { transfer, loading } = useTransfer();
  const methods = useForm<FormValues>({
    resolver: yupResolver(formSchema),
    defaultValues,
    context: { targetLoaderId: targetLoader?.id },
  });

  const onSubmit = useCallback(
    async (values: FormValues) => {
      try {
        const { data } = await transfer({
          variables: {
            items: values.items
              .filter((item) => item.quantity > 0)
              .map((item) => ({
                itemId: item.itemId,
                quantity: item.quantity,
              })),
          },
        });

        if (data?.transfer) {
          Message.success('對點成功');
          closeModal();
        }
      } catch (error) {
        console.error(error);
      }
    },
    [closeModal, transfer],
  );

  return (
    <FormModalWrapper<FormValues>
      methods={methods}
      title="調撥單檢視"
      titleAlign="left"
      confirmText="對點"
      confirmButtonProps={{
        disabled: loading,
        loading,
      }}
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
              title="調撥單號"
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
              title="接收者"
            >
              <DescriptionContent>{receiver || '-'}</DescriptionContent>
            </Description>
            <Description
              widthType="stretch"
              orientation="vertical"
              title="建立時間"
            >
              <DescriptionContent>
                {dayjs(createdAt).format('YYYY-MM-DD HH:mm')}
              </DescriptionContent>
            </Description>
            <Description
              widthType="stretch"
              orientation="vertical"
              title="目標位置"
            >
              <DescriptionContent>
                {targetLocation ? targetLocation.name : '-'}
              </DescriptionContent>
            </Description>
            <Description
              widthType="stretch"
              orientation="vertical"
              title="目標載具"
            >
              <DescriptionContent>
                {targetLoader ? targetLoader.name : '-'}
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

export default InventoryMovementTransferFormBody;
