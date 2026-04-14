import * as Yup from 'yup';
import { FormValues } from './typing';

export const formSchema: Yup.ObjectSchema<FormValues> = Yup.object({
  targetLocation: Yup.object({
    id: Yup.string().required('必填'),
    name: Yup.string().required('必填'),
  }).nullable(),
  targetLoader: Yup.object({
    id: Yup.string().required('必填'),
    name: Yup.string().required('必填'),
  }).nullable(),
  description: Yup.string(),
  items: Yup.array()
    .of(
      Yup.object({
        material: Yup.object({
          id: Yup.string().required('必填'),
          name: Yup.string().required('必填'),
        }).required('必填'),
        description: Yup.string(),
        batch: Yup.object({
          id: Yup.string().required('必填'),
          name: Yup.string().required('必填'),
        }).nullable(),
        location: Yup.object({
          id: Yup.string().required('必填'),
          name: Yup.string().required('必填'),
        }).nullable(),
        loader: Yup.object({
          id: Yup.string().required('必填'),
          name: Yup.string().required('必填'),
        }).nullable(),
        quantity: Yup.number()
          .integer('必須為整數')
          .min(0, '不可小於 0')
          .test('max-quantity', '不可超過剩餘調撥數量', function (value) {
            const { targetTransferredQuantity, transferredQuantity } =
              this.parent;

            if (!value) return true;

            const max = targetTransferredQuantity - transferredQuantity;

            return value <= max;
          })
          .required('必填'),
        unit: Yup.string().required('必填'),
        saleId: Yup.object({
          id: Yup.string().required('必填'),
          name: Yup.string().required('必填'),
        }).nullable(),
        saleSerialId: Yup.object({
          id: Yup.string().required('必填'),
          name: Yup.string().required('必填'),
        }).nullable(),

        itemId: Yup.string(),
        targetTransferredQuantity: Yup.number().required('必填'),
        transferredQuantity: Yup.number().required('必填'),
        unitOptions: Yup.array()
          .of(
            Yup.object({
              id: Yup.string().required('必填'),
              name: Yup.string().required('必填'),
            }),
          )
          .required('必填'),
        isExisted: Yup.boolean().required('必填'),
        removedAt: Yup.string(),
      }),
    )
    .required('必填'),
});
