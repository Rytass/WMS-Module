import * as Yup from 'yup';
import { FormValues } from './typing';

export const formSchema: Yup.ObjectSchema<FormValues> = Yup.object({
  items: Yup.array()
    .of(
      Yup.object({
        itemId: Yup.string().required('必填'),
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
          .test(
            'must-full-quantity',
            '來源載具與目標載具相同，必須執行全部數量',
            function (value) {
              const { loader, targetTransferredQuantity, transferredQuantity } =
                this.parent;
              const targetLoaderId = this.options.context?.targetLoaderId;

              if (!targetLoaderId || !loader || loader.id !== targetLoaderId) {
                return true;
              }

              const remaining = targetTransferredQuantity - transferredQuantity;

              return value === remaining;
            },
          )
          .required('必填'),
        targetTransferredQuantity: Yup.number().required('必填'),
        transferredQuantity: Yup.number().required('必填'),
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
        saleId: Yup.object({
          id: Yup.string().required('必填'),
          name: Yup.string().required('必填'),
        }).nullable(),
        saleSerialId: Yup.object({
          id: Yup.string().required('必填'),
          name: Yup.string().required('必填'),
        }).nullable(),
      }),
    )
    .required('必填'),
});
