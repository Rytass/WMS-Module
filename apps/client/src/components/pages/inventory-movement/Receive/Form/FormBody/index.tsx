import { useCallback } from 'react';
import dayjs from 'dayjs';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  Typography,
  Description,
  DescriptionContent,
  Message,
} from '@mezzanine-ui/react';
import { FormModalWrapper } from '../../../../../fields/FormModalWrapper';
import SectionWrapper from '../../../../../SectionWrapper';
import FieldArrayTable from './FieldArrayTable';
import { formSchema } from '../schema';
import { FormValues } from '../typing';
import { useReceive } from '../../../useApi';
import { YesOrNo } from '../../../../../../utils/share';
import classes from './index.module.scss';

interface InventoryMovementReceiveFormBodyProps {
  defaultValues: FormValues;
  orderKey: string;
  createdBy?: string | null;
  createdAt: string;
  description?: string;
  closeModal: VoidFunction;
  open: boolean;
}

function InventoryMovementReceiveFormBody({
  defaultValues,
  orderKey,
  createdBy,
  createdAt,
  description,
  closeModal,
  open,
}: InventoryMovementReceiveFormBodyProps) {
  const { receive, loading } = useReceive();
  const methods = useForm<FormValues>({
    resolver: yupResolver(formSchema),
    defaultValues,
  });

  const onSubmit = useCallback(
    async (values: FormValues) => {
      try {
        const { data } = await receive({
          variables: {
            items: values.items
              .filter((item) => item.quantity > 0)
              .map((item) => ({
                itemId: item.itemId,
                batchKey: item.batch?.name,
                locationKey: item.location?.name,
                loaderKey: item.loader?.name,
                quantity: item.quantity,
                inspecttionResult: item.requireInspection
                  ? item.inspectionResult === YesOrNo.NULL
                    ? undefined
                    : item.inspectionResult === YesOrNo.YES
                  : undefined,
              })),
          },
        });

        if (data?.receive) {
          Message.success('入庫成功');
          closeModal();
        }
      } catch (error) {
        console.error(error);
      }
    },
    [closeModal, receive],
  );

  return (
    <FormModalWrapper<FormValues>
      methods={methods}
      title="入庫"
      titleAlign="left"
      confirmText="入庫"
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
              title="入庫單號"
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

export default InventoryMovementReceiveFormBody;
