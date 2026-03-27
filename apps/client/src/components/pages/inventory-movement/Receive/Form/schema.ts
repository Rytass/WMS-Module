import * as Yup from 'yup';
import { FormValues } from './typing';

export const formSchema: Yup.ObjectSchema<FormValues> = Yup.object({
  items: Yup.array()
    .of(
      Yup.object({
        quantity: Yup.number()
          .integer('必須為整數')
          .min(0, '不可小於 0')
          .test('max-quantity', '不可超過剩餘入庫數量', function (value) {
            const { targetReceivedQuantity, receivedQuantity } = this.parent;

            if (value == null) return true;

            const max = targetReceivedQuantity - receivedQuantity;

            return value <= max;
          })
          .required('必填'),
        targetReceivedQuantity: Yup.number().required('必填'),
        receivedQuantity: Yup.number().required('必填'),
        serialId: Yup.string().required('必填'),
        unitId: Yup.string().nullable(),
        unitOptions: Yup.array()
          .of(
            Yup.object({
              id: Yup.string().required('必填'),
              name: Yup.string().required('必填'),
            }),
          )
          .required('必填'),
        material: Yup.object({
          id: Yup.string().required('必填'),
          name: Yup.string().required('必填'),
        }).required('必填'),
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
        materialDescription: Yup.string(),
      }),
    )
    .required('必填'),
});
