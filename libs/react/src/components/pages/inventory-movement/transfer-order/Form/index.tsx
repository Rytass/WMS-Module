import { useCallback } from 'react';
import { useWmsRouter } from '../../../../../router/context';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Message } from '@mezzanine-ui/react';
import { FormWrapper } from '../../../../fields/FormWrapper';
import TransferOrderFormBody from './FormBody';
import { useUpdateTransferOrder } from '../../useApi';
import { BASE_UNIT } from '../../../../../utils/share';
import { formSchema } from './schema';
import { FormValues } from './typing';

interface TransferOrderFormProps {
  orderId: string;
  defaultValues: FormValues;
  title: string;
  breadcrumbTitle: string;
  createdBy?: string | null;
  receiver?: string | null;
  createdAt: string;
}

function TransferOrderForm({
  orderId,
  defaultValues,
  title,
  breadcrumbTitle,
  createdBy,
  receiver,
  createdAt,
}: TransferOrderFormProps) {
  const { back } = useWmsRouter();
  const { updateTransferOrder } = useUpdateTransferOrder();
  const methods = useForm<FormValues>({
    resolver: yupResolver(formSchema),
    defaultValues,
  });

  const onSubmit = useCallback(
    async (values: FormValues) => {
      try {
        const { data } = await updateTransferOrder({
          variables: {
            updateTransferOrderId: orderId,
            locationId: values.targetLocation?.id ?? '',
            loaderId: values.targetLoader?.id,
            description: values.description || '',
            items: values.items.map((item) => {
              return {
                id: item.itemId,
                aggregatedKey: item.stockId,
                unitId: item.unit === BASE_UNIT ? null : item.unit,
                targetTransferredQuantity: item.newQuantity,
                removedAt: item.removedAt,
              };
            }),
          },
        });

        if (data?.updateTransferOrder.id) {
          Message.success('儲存成功');
          back();
        }
      } catch (error) {
        console.error(error);
      }
    },
    [back, orderId, updateTransferOrder],
  );

  return (
    <FormWrapper
      methods={methods}
      havePageFooter
      submitText="儲存"
      onSubmit={onSubmit}
      pureFormProvider
    >
      <TransferOrderFormBody
        title={title}
        breadcrumbTitle={breadcrumbTitle}
        createdBy={createdBy}
        receiver={receiver}
        createdAt={createdAt}
      />
    </FormWrapper>
  );
}

export default TransferOrderForm;
